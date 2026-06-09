/** @type {import('react-doctor').Config} */
export default {
  rules: {
    // Industrial dashboards intentionally use dense typography (8–11px)
    // for data-rich interfaces; suppressing the size warning is deliberate.
    'react-doctor/text-too-small': 'off',
  },
}
