-- Fresh install schema. WARNING: this recreates hms_db. Backup existing data first.
DROP DATABASE IF EXISTS hms_db;
CREATE DATABASE hms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hms_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('super_admin','admin','doctor','nurse','receptionist','accountant','pharmacist','lab_technician','patient') NOT NULL DEFAULT 'receptionist',
  phone VARCHAR(20),
  status ENUM('active','inactive') DEFAULT 'active',
  reset_token VARCHAR(255),
  reset_token_expires DATETIME,
  password_changed_at DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_uid VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  dob DATE,
  age INT,
  gender ENUM('male','female','other'),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  blood_group VARCHAR(10),
  marital_status VARCHAR(50),
  occupation VARCHAR(255),
  aadhaar_number VARCHAR(50),
  emergency_contact VARCHAR(20),
  guardian_name VARCHAR(255),
  guardian_phone VARCHAR(20),
  insurance_provider VARCHAR(255),
  medical_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_uid VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  specialization VARCHAR(255),
  qualification VARCHAR(255),
  experience_years INT DEFAULT 0,
  consultation_fee DECIMAL(10,2) DEFAULT 0,
  department_id INT NULL,
  opd_timing VARCHAR(255),
  ipd_timing VARCHAR(255),
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_uid VARCHAR(100) UNIQUE NOT NULL,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  appointment_type ENUM('normal','emergency') DEFAULT 'normal',
  status ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS beds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bed_number VARCHAR(100) UNIQUE NOT NULL,
  bed_type ENUM('ICU','General Ward','Private Room','Semi-Private','VIP Room','Emergency') NOT NULL,
  status ENUM('available','occupied','cleaning') DEFAULT 'available',
  floor_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS opd_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  consultation_notes TEXT,
  prescription TEXT,
  follow_up_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ipd_admissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  room_number VARCHAR(100),
  bed_id INT NULL,
  admission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  discharge_date DATETIME NULL,
  diagnosis TEXT,
  treatment_plan TEXT,
  discharge_summary TEXT,
  status ENUM('admitted','discharged') DEFAULT 'admitted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS nursing_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ipd_id INT NOT NULL,
  nurse_id INT NULL,
  notes TEXT,
  vitals JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ipd_id) REFERENCES ipd_admissions(id) ON DELETE CASCADE,
  FOREIGN KEY (nurse_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lab_tests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  doctor_id INT NULL,
  notes TEXT,
  billing_amount DECIMAL(10,2) DEFAULT 0,
  test_status ENUM('booked','sample_collected','completed') DEFAULT 'booked',
  report_file VARCHAR(255),
  report_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS radiology_tests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  scan_type VARCHAR(255) NOT NULL,
  doctor_id INT NULL,
  notes TEXT,
  billing_amount DECIMAL(10,2) DEFAULT 0,
  status ENUM('booked','completed') DEFAULT 'booked',
  image_file VARCHAR(255),
  report_file VARCHAR(255),
  report_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medicine_name VARCHAR(255) NOT NULL,
  batch_number VARCHAR(100),
  expiry_date DATE,
  quantity INT DEFAULT 0,
  purchase_price DECIMAL(10,2) DEFAULT 0,
  selling_price DECIMAL(10,2) DEFAULT 0,
  supplier_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pharmacy_sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medicine_id INT NOT NULL,
  patient_id INT NULL,
  quantity INT NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS billing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  patient_id INT NOT NULL,
  subtotal DECIMAL(12,2) DEFAULT 0,
  gst_amount DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  payment_status ENUM('pending','partial','paid') DEFAULT 'pending',
  payment_method VARCHAR(100),
  billing_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action TEXT NOT NULL,
  module_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS security_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO departments (id, department_name, description) VALUES
(1,'General Medicine','General outpatient and inpatient care'),
(2,'Cardiology','Heart and vascular care'),
(3,'Pathology','Laboratory diagnostics');

INSERT IGNORE INTO beds (id, bed_number, bed_type, status, floor_number) VALUES
(1,'G-101','General Ward','available','1'),
(2,'ICU-1','ICU','available','2'),
(3,'P-201','Private Room','available','2');

INSERT IGNORE INTO security_settings (setting_key, setting_value) VALUES
('password_min_length','8'),('session_timeout_minutes','60'),('audit_retention_days','365'),('backup_frequency','daily');

-- Admin user is created securely by backend/scripts/seed-admin.js using bcryptjs.
-- After importing this SQL, run from backend folder: npm run seed
