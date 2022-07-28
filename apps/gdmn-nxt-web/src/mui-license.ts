import { LicenseInfo } from '@mui/x-data-grid-pro';

export function registerMUI () {
  LicenseInfo.setLicenseKey(
    process.env.NX_MUI_LICENSE || '',
  );
};
