-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 21, 2025 at 08:28 PM
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
-- Table structure for table `driverdetails`
--

CREATE TABLE `driverdetails` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `driverdetails`
--

INSERT INTO `driverdetails` (`id`, `name`, `email`, `password`, `created_at`, `updated_at`) VALUES
(1, 'a', 'a@a.a', '$2y$10$KBNWra12ZWAqRdRJAY0AceGkHAqEXP.at5hydrlZ08ORQw141OIxa', '2025-08-21 06:41:31', '2025-08-21 06:41:31'),
(2, 'w', 'w@w.w', '$2y$10$VUYLhevnPAtKghOpxgckeuW.cQsG2UPC7VR0znbnllBOj9MDgotlm', '2025-08-21 08:58:43', '2025-08-21 08:58:43');

-- --------------------------------------------------------

--
-- Table structure for table `ownerdetails`
--

CREATE TABLE `ownerdetails` (
  `id` int(10) UNSIGNED NOT NULL,
  `full_name` varchar(50) NOT NULL,
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

INSERT INTO `ownerdetails` (`id`, `full_name`, `username`, `email`, `nic`, `phone`, `password_hash`, `created_at`) VALUES
(1, 'AA', 'a', 'a@a.a', 'A', '1', '$2y$10$QnoVNkXdaSBY9M4BnrcsWOFaIr/bTJESjMVnOCVPuYxfyNWha1OgG', '2025-08-19 08:51:17'),
(5, 'Gaveesh Heerasinghe', 'gaveesh', 'a@gmail.com', '200017300105', '0741696132', '$2y$10$1vJhgmJW.n6DfgZY115KKuAtCYLIiXvNQ/ereZu/ZE.1lZ8jxlD5q', '2025-08-19 18:00:04'),
(7, 'qgsuhsbh', 'q', 'q@q.q', '7282727282992', '34584894644', '$2y$10$FL48nKPooOlowpNt7my51u5VECY5FTXyThQm.nz7DfXGTWBWMSVcO', '2025-08-19 20:49:31'),
(22, 'niiippoij', 'nipun', 'a2@gmail.com', '5567788866', '0711524753', '$2y$10$9NfedDu0qGIBKu0srKTnK.z8rZKWe9TtiDDptQ5XvkJgY0aw7o4kG', '2025-08-20 14:32:05'),
(23, 'bayhshs', 'ba', 'ba@ba.ba', '72927373772822', '31548845', '$2y$10$SMK0oK4jO6iJongpiC.tje8MZ7sjUyHTv4/q1BrMyXHOVWbokaPfS', '2025-08-20 17:20:06'),
(27, 'eeeeeeee', 'e', 'e@e.e', '6288266377711891', '2884942584443', '$2y$10$yOpe0QG62HPf0qfsQdnKcON/zf1/WCMEaDPZT1f7XH/fM9hs23UOS', '2025-08-21 08:59:16');

-- --------------------------------------------------------

--
-- Table structure for table `parking_space`
--

CREATE TABLE `parking_space` (
  `id` int(10) UNSIGNED NOT NULL,
  `owner_id` int(10) UNSIGNED NOT NULL,
  `parking_name` varchar(150) NOT NULL,
  `location` varchar(500) NOT NULL,
  `availability` varchar(500) NOT NULL,
  `status` enum('pending','reject','accept') NOT NULL DEFAULT 'pending',
  `description` text DEFAULT NULL,
  `agreement_path` varchar(500) DEFAULT NULL,
  `photos_path` varchar(500) DEFAULT NULL,
  `latitude` decimal(9,6) DEFAULT NULL,
  `longitude` decimal(10,6) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `parking_space`
--

INSERT INTO `parking_space` (`id`, `owner_id`, `parking_name`, `location`, `availability`, `status`, `description`, `agreement_path`, `photos_path`, `latitude`, `longitude`, `created_at`) VALUES
(1, 5, 'Gaveee', '67, Sri Siddhartha Path, Colombo 05, Western Province, 00500, Sri Lanka', 'Tue–Wed 9:00 AM — 5:00 PM', 'accept', 'Hh', 'uploads/owners/5/gaveee/agreement_5_gaveee_1755631215.pdf', 'uploads/owners/5/gaveee/', NULL, NULL, '2025-08-19 19:20:15'),
(2, 1, 'R', '67, Sri Siddhartha Path, Colombo 05, Western Province, 00500, Sri Lanka', 'Tue–Wed 9:00 AM — 5:00 PM', 'accept', '', 'uploads/owners/1/r/agreement_1_r_1755631475.pdf', 'uploads/owners/1/r/', NULL, NULL, '2025-08-19 19:24:35'),
(3, 5, 'Ggg', '67, Sri Siddhartha Path, Colombo 05, Western Province, 00500, Sri Lanka', 'Tue–Thu 9:00 AM — 5:00 PM', 'accept', '', 'uploads/owners/5/ggg/agreement_5_ggg_1755632912.pdf', 'uploads/owners/5/ggg/', NULL, NULL, '2025-08-19 19:48:32'),
(4, 7, 'Pasindu', 'Sri Siddhartha path, Sri Siddhartha path, Colombo, Western Province, Sri Lanka', 'Mon 9:00 AM — 5:00 PM; Tue 12:00 PM — 3:00 PM; Wed 9:00 AM — 5:00 PM', 'accept', 'bsisindhjdjdhhdjsd', 'uploads/owners/7/pasindu/agreement_7_pasindu_1755636764.pdf', 'uploads/owners/7/pasindu/', NULL, NULL, '2025-08-19 20:52:44'),
(5, 7, 'ravindu', 'Sri Siddhartha path, Sri Siddhartha path, Colombo, Western Province, Sri Lanka', 'Mon 9:00 AM — 5:00 PM; Tue 12:00 PM — 3:00 PM; Wed 9:00 AM — 5:00 PM', 'accept', 'bzjsjs', 'uploads/owners/7/ravindu/agreement_7_ravindu_1755636959.pdf', 'uploads/owners/7/ravindu/', NULL, NULL, '2025-08-19 20:55:59'),
(6, 7, 'Sandun', 'Kalegana Road, Kalegana Road, Galle, Southern Province, Sri Lanka', 'Mon 9:00 AM — 5:00 PM; Tue 12:00 PM — 3:00 PM; Wed 9:00 AM — 5:00 PM', 'accept', 'jajjsjdd', 'uploads/owners/7/sandun/agreement_7_sandun_1755637390.pdf', 'uploads/owners/7/sandun/', NULL, NULL, '2025-08-19 21:03:10'),
(7, 1, 'ggj', 'Sri Siddhartha path, Sri Siddhartha path, Colombo, Western Province, Sri Lanka', 'Mon 9:00 AM — 5:00 PM; Tue 12:00 PM — 3:00 PM; Wed 9:00 AM — 5:00 PM', 'accept', 'hmhh', 'uploads/owners/1/ggj/agreement_1_ggj_1755714588.pdf', 'uploads/owners/1/ggj/', NULL, NULL, '2025-08-20 18:29:48'),
(8, 1, 'gaveesh', 'Colombo, Colombo, Western Province, Sri Lanka', 'Tue 12:00 PM — 3:00 PM; Wed 9:00 AM — 5:00 PM', 'accept', 'gsbajishhdddjkjasdjdjs\njdjjndd\nhnjndd', 'uploads/owners/1/gaveesh/agreement_1_gaveesh_1755763961.pdf', 'uploads/owners/1/gaveesh/', 6.902276, 79.860476, '2025-08-21 08:12:41'),
(9, 27, 'gaveesh', 'Colombo, Colombo, Western Province, Sri Lanka', 'Tue 12:00 PM — 3:00 PM; Wed 9:00 AM — 5:00 PM; Thu 9:00 AM — 10:00 AM', 'accept', 'bnakhbbdinnsss', 'uploads/owners/27/gaveesh/agreement_27_gaveesh_1755766803.pdf', 'uploads/owners/27/gaveesh/', 6.902274, 79.860473, '2025-08-21 09:00:03'),
(10, 1, 'viharamahadewi', 'Colombo, Colombo, Western Province, Sri Lanka', 'Tue 12:00 PM — 3:00 PM; Wed 9:00 AM — 5:00 PM; Thu 9:00 AM — 10:00 AM', 'accept', '', NULL, 'uploads/owners/1/viharamahadewi/', 6.902274, 79.860473, '2025-08-21 09:20:10'),
(11, 1, 'dushan', 'Station Road, Station Road, Colombo, Western Province, Sri Lanka', 'Tue 12:00 PM — 3:00 PM; Wed 9:00 AM — 5:00 PM; Thu 9:00 AM — 10:00 AM', 'accept', '', NULL, 'uploads/owners/1/dushan/', 6.893575, 79.854477, '2025-08-21 09:48:45'),
(12, 1, 'Hawalock', 'Havelock Road, Havelock Road, Colombo, Western Province, Sri Lanka', 'Wed 9:00 AM — 5:00 PM; Thu 9:00 AM — 10:00 AM', 'accept', '', NULL, 'uploads/owners/1/hawalock/', 6.874065, 79.871719, '2025-08-21 15:06:16'),
(13, 1, 'Chamara', 'Baseline Road, Baseline Road, Colombo, Western Province, Sri Lanka', 'Sat 10:00 AM — 5:00 PM; Sun 9:00 AM — 1:00 PM', 'accept', 'ane mta ba', 'uploads/owners/1/chamara/agreement_1_chamara_1755800794.pdf', 'uploads/owners/1/chamara/', 6.878379, 79.876503, '2025-08-21 18:26:34');

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(10) UNSIGNED NOT NULL,
  `parking_space_id` int(10) UNSIGNED NOT NULL,
  `payment` decimal(10,2) NOT NULL DEFAULT 0.00,
  `pin` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `parking_space_id`, `payment`, `pin`, `created_at`) VALUES
(20, 7, 7.50, NULL, '2025-08-21 04:09:59'),
(21, 7, 2.50, NULL, '2025-08-21 04:11:12'),
(22, 7, 0.00, NULL, '2025-08-21 04:14:23');

-- --------------------------------------------------------

--
-- Table structure for table `pricing`
--

CREATE TABLE `pricing` (
  `id` int(10) UNSIGNED NOT NULL,
  `parking_space_id` int(10) UNSIGNED NOT NULL,
  `price_unit` enum('hour','day') NOT NULL,
  `cars` int(11) NOT NULL DEFAULT 0,
  `vans` int(11) NOT NULL DEFAULT 0,
  `bikes` int(11) NOT NULL DEFAULT 0,
  `buses` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pricing`
--

INSERT INTO `pricing` (`id`, `parking_space_id`, `price_unit`, `cars`, `vans`, `bikes`, `buses`) VALUES
(1, 1, 'hour', 200, 500, 200, 1000),
(2, 2, 'hour', 50, 50, 50, 50),
(3, 3, 'hour', 50, 50, 100, 50),
(4, 4, 'hour', 250, 300, 250, 300),
(5, 5, 'hour', 100, 250, 150, 50),
(6, 6, 'hour', 150, 150, 150, 150),
(7, 7, 'hour', 150, 150, 500, 500),
(8, 8, 'hour', 50, 50, 50, 150),
(9, 9, 'hour', 150, 150, 150, 150),
(10, 10, 'hour', 150, 150, 150, 100),
(11, 11, 'hour', 50, 50, 50, 100),
(12, 12, 'hour', 50, 50, 100, 100),
(13, 13, 'hour', 200, 150, 100, 50);

-- --------------------------------------------------------

--
-- Table structure for table `spaces`
--

CREATE TABLE `spaces` (
  `id` int(10) UNSIGNED NOT NULL,
  `parking_space_id` int(10) UNSIGNED NOT NULL,
  `cars` int(11) NOT NULL DEFAULT 0,
  `vans` int(11) NOT NULL DEFAULT 0,
  `bikes` int(11) NOT NULL DEFAULT 0,
  `buses` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `spaces`
--

INSERT INTO `spaces` (`id`, `parking_space_id`, `cars`, `vans`, `bikes`, `buses`) VALUES
(1, 1, 3, 2, 2, 2),
(2, 2, 1, 0, 0, 0),
(3, 3, 1, 0, 1, 0),
(4, 4, 5, 5, 5, 6),
(5, 5, 3, 2, 3, 2),
(6, 6, 3, 1, 2, 2),
(7, 7, 2, 4, 4, 3),
(8, 8, 2, 2, 3, 2),
(9, 9, 4, 4, 4, 4),
(10, 10, 3, 3, 3, 2),
(11, 11, 2, 2, 2, 2),
(12, 12, 1, 1, 1, 1),
(13, 13, 4, 3, 2, 1);

-- --------------------------------------------------------

--
-- Table structure for table `vehicles`
--

CREATE TABLE `vehicles` (
  `id` int(10) UNSIGNED NOT NULL,
  `parking_space_id` int(10) UNSIGNED NOT NULL,
  `vehicle_no` varchar(20) NOT NULL,
  `category` enum('cars','vans','bikes','buses') NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `in_time` datetime NOT NULL,
  `out_time` datetime DEFAULT NULL,
  `pin` varchar(12) DEFAULT NULL,
  `status` enum('in','out') NOT NULL DEFAULT 'in',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `vehicles`
--

INSERT INTO `vehicles` (`id`, `parking_space_id`, `vehicle_no`, `category`, `phone`, `in_time`, `out_time`, `pin`, `status`, `created_at`) VALUES
(56, 7, 'ABC', 'cars', '5454', '2025-08-21 09:36:00', '2025-08-21 09:39:00', '123', 'out', '2025-08-21 04:06:11'),
(57, 7, 'ABC', 'vans', '155', '2025-08-21 09:40:00', '2025-08-21 09:41:00', '258', 'out', '2025-08-21 04:10:50'),
(58, 7, 'ABC', 'vans', '558', '2025-08-21 09:42:00', '2025-08-21 09:42:00', '225', 'out', '2025-08-21 04:12:21');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `driverdetails`
--
ALTER TABLE `driverdetails`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_driver_email` (`email`),
  ADD UNIQUE KEY `uq_driver_name` (`name`);

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
-- Indexes for table `parking_space`
--
ALTER TABLE `parking_space`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_owner_name` (`owner_id`,`parking_name`),
  ADD KEY `idx_parking_space_lat_lng` (`latitude`,`longitude`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_space` (`parking_space_id`);

--
-- Indexes for table `pricing`
--
ALTER TABLE `pricing`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_price_space` (`parking_space_id`);

--
-- Indexes for table `spaces`
--
ALTER TABLE `spaces`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_spaces_space` (`parking_space_id`);

--
-- Indexes for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_space` (`parking_space_id`),
  ADD KEY `idx_vehicle_no` (`vehicle_no`),
  ADD KEY `idx_active` (`parking_space_id`,`vehicle_no`,`status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `driverdetails`
--
ALTER TABLE `driverdetails`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `ownerdetails`
--
ALTER TABLE `ownerdetails`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `parking_space`
--
ALTER TABLE `parking_space`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `pricing`
--
ALTER TABLE `pricing`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `spaces`
--
ALTER TABLE `spaces`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `vehicles`
--
ALTER TABLE `vehicles`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=59;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `parking_space`
--
ALTER TABLE `parking_space`
  ADD CONSTRAINT `fk_ps_owner` FOREIGN KEY (`owner_id`) REFERENCES `ownerdetails` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_space` FOREIGN KEY (`parking_space_id`) REFERENCES `parking_space` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `pricing`
--
ALTER TABLE `pricing`
  ADD CONSTRAINT `fk_price_space` FOREIGN KEY (`parking_space_id`) REFERENCES `parking_space` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `spaces`
--
ALTER TABLE `spaces`
  ADD CONSTRAINT `fk_spaces_space` FOREIGN KEY (`parking_space_id`) REFERENCES `parking_space` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD CONSTRAINT `fk_vehicles_ps` FOREIGN KEY (`parking_space_id`) REFERENCES `parking_space` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
