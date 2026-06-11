export type Vehicle = {
  id: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage: number;
  body: 'Sedan' | 'Coupe' | 'SUV' | 'Truck' | 'Wagon';
  fuel: 'Gas' | 'Hybrid' | 'Electric';
  drive: 'FWD' | 'RWD' | 'AWD';
  exterior: string;
  interior: string;
  aiSummary: string;
};

export const INVENTORY: Vehicle[] = [
  { id: 'cx-001', year: 2023, make: 'Toyota', model: 'Corolla', price: 19500, mileage: 12000, body: 'Sedan', fuel: 'Gas', drive: 'FWD', exterior: 'Pearl White', interior: 'Gray', aiSummary: 'Reliable sedan, great for daily commute' },
  { id: 'cx-002', year: 2022, make: 'Honda', model: 'Civic', price: 21000, mileage: 18000, body: 'Sedan', fuel: 'Gas', drive: 'FWD', exterior: 'Silver', interior: 'Black', aiSummary: 'Fun to drive, excellent fuel economy' },
  { id: 'cx-003', year: 2023, make: 'Mazda', model: 'CX-5', price: 27500, mileage: 8000, body: 'SUV', fuel: 'Gas', drive: 'AWD', exterior: 'Blue', interior: 'Tan', aiSummary: 'Zippy SUV with premium feel' },
  { id: 'cx-004', year: 2021, make: 'Ford', model: 'F-150', price: 35000, mileage: 45000, body: 'Truck', fuel: 'Gas', drive: 'RWD', exterior: 'Black', interior: 'Gray', aiSummary: 'Workhorse truck, towing capacity' },
  { id: 'cx-005', year: 2022, make: 'Subaru', model: 'Outback', price: 28000, mileage: 22000, body: 'Wagon', fuel: 'Gas', drive: 'AWD', exterior: 'Sage Green', interior: 'Black', aiSummary: 'Adventure-ready wagon' },
  { id: 'cx-006', year: 2023, make: 'Hyundai', model: 'Tucson Hybrid', price: 29500, mileage: 5000, body: 'SUV', fuel: 'Hybrid', drive: 'FWD', exterior: 'White', interior: 'Gray', aiSummary: 'Efficient SUV, great warranty' },
  { id: 'cx-007', year: 2022, make: 'Tesla', model: 'Model 3', price: 38000, mileage: 15000, body: 'Sedan', fuel: 'Electric', drive: 'RWD', exterior: 'Pearl White', interior: 'Black', aiSummary: 'Electric performance, tech-forward' },
  { id: 'cx-008', year: 2021, make: 'BMW', model: '330i', price: 36500, mileage: 38000, body: 'Sedan', fuel: 'Gas', drive: 'RWD', exterior: 'Black', interior: 'Black', aiSummary: 'Luxury sedan, sporty handling' },
  { id: 'cx-009', year: 2022, make: 'Audi', model: 'Q5', price: 42000, mileage: 28000, body: 'SUV', fuel: 'Gas', drive: 'AWD', exterior: 'Silver', interior: 'Tan', aiSummary: 'Premium SUV, tech-loaded' },
  { id: 'cx-010', year: 2021, make: 'Lexus', model: 'RX 350', price: 45000, mileage: 35000, body: 'SUV', fuel: 'Gas', drive: 'AWD', exterior: 'Pearl White', interior: 'Tan', aiSummary: 'Luxury reliability, quiet ride' },
  { id: 'cx-011', year: 2020, make: 'Mercedes', model: 'GLE 350', price: 48000, mileage: 52000, body: 'SUV', fuel: 'Gas', drive: 'AWD', exterior: 'Black', interior: 'Black', aiSummary: 'Luxury SUV, commanding presence' },
  { id: 'cx-012', year: 2021, make: 'Porsche', model: 'Macan', price: 52000, mileage: 42000, body: 'SUV', fuel: 'Gas', drive: 'AWD', exterior: 'Red', interior: 'Black', aiSummary: 'Sport SUV, thrilling performance' },
  { id: 'cx-013', year: 2022, make: 'Chevrolet', model: 'Silverado', price: 40000, mileage: 32000, body: 'Truck', fuel: 'Gas', drive: 'RWD', exterior: 'White', interior: 'Gray', aiSummary: 'Full-size truck, comfortable' },
  { id: 'cx-014', year: 2023, make: 'Kia', model: 'Telluride', price: 45000, mileage: 8000, body: 'SUV', fuel: 'Gas', drive: 'AWD', exterior: 'Blue', interior: 'Tan', aiSummary: '3-row SUV, excellent value' },
  { id: 'cx-015', year: 2021, make: 'Jeep', model: 'Wrangler', price: 38000, mileage: 48000, body: 'SUV', fuel: 'Gas', drive: 'AWD', exterior: 'Green', interior: 'Black', aiSummary: 'Off-road legend, convertible' },
  { id: 'cx-016', year: 2022, make: 'Ford', model: 'Mustang GT', price: 44000, mileage: 22000, body: 'Coupe', fuel: 'Gas', drive: 'RWD', exterior: 'Red', interior: 'Black', aiSummary: 'Iconic muscle car, thrilling' },
  { id: 'cx-017', year: 2021, make: 'Chevrolet', model: 'Corvette C8', price: 65000, mileage: 18000, body: 'Coupe', fuel: 'Gas', drive: 'RWD', exterior: 'Yellow', interior: 'Black', aiSummary: 'Supercar performance, mid-engine' },
  { id: 'cx-018', year: 2020, make: 'Porsche', model: '911 Carrera S', price: 85000, mileage: 62000, body: 'Coupe', fuel: 'Gas', drive: 'RWD', exterior: 'Silver', interior: 'Black', aiSummary: 'Iconic sports car, timeless' },
  { id: 'cx-019', year: 2023, make: 'Nissan', model: 'Altima', price: 26000, mileage: 6000, body: 'Sedan', fuel: 'Gas', drive: 'FWD', exterior: 'Blue', interior: 'Gray', aiSummary: 'Comfortable sedan, modern tech' },
  { id: 'cx-020', year: 2022, make: 'Honda', model: 'CR-V', price: 31000, mileage: 24000, body: 'SUV', fuel: 'Gas', drive: 'AWD', exterior: 'Black', interior: 'Black', aiSummary: 'Popular SUV, spacious cargo' },
  { id: 'cx-021', year: 2021, make: 'RAM', model: '1500', price: 42000, mileage: 55000, body: 'Truck', fuel: 'Gas', drive: 'RWD', exterior: 'Silver', interior: 'Gray', aiSummary: 'Smooth-riding truck, luxury cabin' },
  { id: 'cx-022', year: 2022, make: 'Volvo', model: 'XC60', price: 44000, mileage: 19000, body: 'SUV', fuel: 'Gas', drive: 'AWD', exterior: 'White', interior: 'Tan', aiSummary: 'Safety-focused luxury SUV' },
  { id: 'cx-023', year: 2023, make: 'Genesis', model: 'GV70', price: 46000, mileage: 4000, body: 'SUV', fuel: 'Gas', drive: 'AWD', exterior: 'Black', interior: 'Black', aiSummary: 'Luxury luxury brand, great value' },
  { id: 'cx-024', year: 2022, make: 'Toyota', model: 'RAV4 Hybrid', price: 35000, mileage: 28000, body: 'SUV', fuel: 'Hybrid', drive: 'AWD', exterior: 'Gray', interior: 'Black', aiSummary: 'Efficient hybrid, trusted brand' },
];
