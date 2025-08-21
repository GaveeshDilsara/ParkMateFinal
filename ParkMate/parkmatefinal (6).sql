-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 19, 2025 at 06:03 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `parkmatefinal`
--

-- --------------------------------------------------------

--
-- Table structure for table `ownerdetails`
--

CREATE TABLE `ownerdetails` (
  `id` int(10) UNSIGNED NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(120) NOT NULL,
  `nic` varchar(20) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ownerdetails`
--

INSERT INTO `ownerdetails` (`id`, `username`, `email`, `nic`, `phone`, `password_hash`, `created_at`) VALUES
(1, 'a', 'a@a.a', 'A', '1', '$2y$10$QnoVNkXdaSBY9M4BnrcsWOFaIr/bTJESjMVnOCVPuYxfyNWha1OgG', '2025-08-19 08:51:17');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ownerdetails`
--
ALTER TABLE `ownerdetails`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_username` (`username`),
  ADD UNIQUE KEY `uq_email` (`email`),
  ADD UNIQUE KEY `uq_phone` (`phone`),
  ADD UNIQUE KEY `uq_nic` (`nic`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ownerdetails`
--
ALTER TABLE `ownerdetails`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
