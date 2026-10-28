// Placeholder values until Week 1 research confirms them.
// If you change UNITS, also change the check constraints in the SQL migration.

// Towns people can pick for their own area, pickup and destination. Kept A to Z for the dropdowns.
export const PILOT_AREAS = [
  'Aburi', 'Accra', 'Cape Coast', 'Ejura', 'Ho', 'Kintampo', 'Koforidua', 'Kumasi', 'Nkoranza',
  'Nsawam', 'Sunyani', 'Takoradi', 'Tamale', 'Techiman', 'Tema', 'Wenchi',
]

export const UNITS = ['crates', 'bags', 'kg', 'tonnes']

export const VEHICLE_TYPES = ['Pickup truck', 'Kia / mini truck', 'Tipper truck', 'Motor king (tricycle)', 'Other']

// Shown when a user needs help with a problem the app can't fix
export const SUPPORT_CONTACT = {
  name: 'FarmHaul pilot support',
  phone: '+233 20 000 0000',
}

export const STATUS_LABELS = {
  OPEN: 'Open for offers',
  ASSIGNED: 'Transporter assigned',
  PICKED_UP: 'Picked up',
  DELIVERED: 'Delivered',
  CONFIRMED: 'Confirmed by farmer',
  CANCELLED: 'Cancelled',
}

export const OFFER_STATUS_LABELS = {
  ACTIVE: 'Waiting for farmer',
  WITHDRAWN: 'Withdrawn',
  ACCEPTED: 'Accepted',
  DECLINED: 'Not chosen',
}

// How often pages with changing data re-check the database (milliseconds)
export const POLL_MS = 15000
