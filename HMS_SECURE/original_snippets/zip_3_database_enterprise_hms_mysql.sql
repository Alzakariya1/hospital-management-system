-- ZIP 3 - Enterprise HMS Database
-- File: database/enterprise_hms.sql
-- MySQL Production-Level Schema

CREATE DATABASE IF NOT EXISTS enterprise_hms;
USE enterprise_hms;

-- USERS TABLE (Login + RBAC)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM(
        'super_admin',
        'admin',
        'doctor',
        'nurse',
        'receptionist',
        'accountant',
        'pharmacist',
        'lab_technician',
        'patient'
    ) NOT NULL,
    phone VARCHAR(20),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PATIENTS TABLE
CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_uid VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    dob DATE,
    age INT,
    gender ENUM('male', 'female', 'other'),
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

-- DEPARTMENTS TABLE
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DOCTORS TABLE
CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_uid VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    specialization VARCHAR(255),
    qualification VARCHAR(255),
    experience_years INT,
    consultation_fee DECIMAL(10,2),
    department_id INT,
    opd_timing VARCHAR(255),
    ipd_timing VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- APPOINTMENTS TABLE
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_uid VARCHAR(100) UNIQUE NOT NULL,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    appointment_type ENUM('normal', 'emergency') DEFAULT 'normal',
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

-- BEDS TABLE
CREATE TABLE beds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bed_number VARCHAR(100) UNIQUE NOT NULL,
    bed_type ENUM(
        'ICU',
        'General Ward',
        'Private Room',
        'Semi-Private',
        'VIP Room',
        'Emergency'
    ) NOT NULL,
    status ENUM('available', 'occupied', 'cleaning') DEFAULT 'available',
    floor_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BILLING TABLE
CREATE TABLE billing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    patient_id INT NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    payment_status ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
    payment_method VARCHAR(100),
    billing_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- PHARMACY TABLE
CREATE TABLE medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medicine_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100),
    expiry_date DATE,
    quantity INT DEFAULT 0,
    purchase_price DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    supplier_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LAB TESTS TABLE
CREATE TABLE lab_tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    test_status ENUM('booked', 'sample_collected', 'completed') DEFAULT 'booked',
    report_file VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- AUDIT LOGS TABLE
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action TEXT NOT NULL,
    module_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- SAMPLE SUPER ADMIN USER
INSERT INTO users (
    full_name,
    email,
    password,
    role,
    phone,
    status
) VALUES (
    'Super Admin',
    'admin@hospital.com',
    '$2b$10$examplehashedpasswordforproductionreplace',
    'super_admin',
    '9999999999',
    'active'
);
