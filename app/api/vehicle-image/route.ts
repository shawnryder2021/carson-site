import { requireAdminClient, kieKey, createKieTask, getKieTask, saveKieImage } from '@/lib/kie';
import { displayTrim } from '@/lib/sm360';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// AI illustrations for vehicles that have no real photos yet (Admin → Missing photos).
//   generate { vehicleId }      → { taskId, prompt }   (prompt built server-side from the car's data)
//   status   { taskId }         → { status, urls? }
//   save     { vehicleId, url } → copies to Storage, sets vehicles.ai_image → { publicUrl }
//   remove   { vehicleId }      → clears vehicles.ai_image
// The site labels these "AI illustration"; real photos from the sync always take precedence.

function promptFor(v: any): string {
  const colour = (v.exterior || '').toLowerCase();
  const name = [v.year, v.make, v.model, displayTrim(v.trim)].filter(Boolean).join(' ');
  const kind = v.body === 'Truck' ? 'pickup truck' : v.body === 'Coupe' ? 'coupe' : v.body === 'Wagon' ? 'wagon' : v.body === 'SUV' ? 'SUV' : 'sedan';
  return [
    `Professional car dealership studio photograph of a ${colour ? colour + ' ' : ''}${name} ${kind}.`,
    'Front three-quarter view, whole vehicle in frame, centred, parked in a bright modern photo studio',
    'with light grey walls and a polished light grey floor, soft even lighting, realistic, sharp focus.',
    'No people, no text, no watermarks, no licence plate.',
  ].join(' ');
}

export async function POST(req: Request) {
  const KEY = kieKey();
  if (!KEY) return Response.json({ error: 'Image generation not configured (set KIE_API_KEY).' }, { status: 503 });

  const sb = await requireAdminClient(req);
  if (!sb) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = body.action || 'generate';

  try {
    if (action === 'generate') {
      if (!body.vehicleId) return Response.json({ error: 'vehicleId required' }, { status: 400 });
      const { data: v, error } = await sb.from('vehicles').select('*').eq('id', body.vehicleId).maybeSingle();
      if (error || !v) return Response.json({ error: 'Vehicle not found' }, { status: 404 });
      const prompt = promptFor(v);
      const { taskId, error: startError } = await createKieTask(KEY, prompt, '3:2');
      if (startError) return Response.json({ error: startError }, { status: 502 });
      return Response.json({ taskId, prompt });
    }

    if (action === 'status') {
      if (!body.taskId) return Response.json({ error: 'taskId required' }, { status: 400 });
      return Response.json(await getKieTask(KEY, body.taskId));
    }

    if (action === 'save') {
      if (!body.vehicleId || !body.url) return Response.json({ error: 'vehicleId and url required' }, { status: 400 });
      const { publicUrl, error, status } = await saveKieImage(sb, body.url, 'vehicles');
      if (error) return Response.json({ error }, { status: status || 500 });
      const { error: upErr } = await sb.from('vehicles')
        .update({ ai_image: publicUrl, ai_image_at: new Date().toISOString() })
        .eq('id', body.vehicleId);
      if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
      return Response.json({ publicUrl });
    }

    if (action === 'remove') {
      if (!body.vehicleId) return Response.json({ error: 'vehicleId required' }, { status: 400 });
      const { error } = await sb.from('vehicles').update({ ai_image: null, ai_image_at: null }).eq('id', body.vehicleId);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Image request failed' }, { status: 500 });
  }
}
