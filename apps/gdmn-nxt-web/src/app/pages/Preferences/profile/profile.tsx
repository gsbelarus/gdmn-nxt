import styles from './profile.module.less';
import { CardContent, CardHeader, Divider, Tab, Tabs, Typography } from '@mui/material';
import CustomizedCard from '../../../components/Styled/customized-card/customized-card';
import { useEffect, useState } from 'react';
import { useGetProfileSettingsQuery } from '../../../features/profileSettings';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import ShieldIcon from '@mui/icons-material/Shield';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { useLocation } from 'react-router-dom';
import SystemTab from './tabs/system';
import PermissionsGate from '@gdmn-nxt/components/Permissions/permission-gate/permission-gate';
import usePermissions from '@gdmn-nxt/components/helpers/hooks/usePermissions';
import useUserData from '@gdmn-nxt/components/helpers/hooks/useUserData';
import AccountTab from './tabs/account';
import SecurityTab from './tabs/security';
import NotificationsTab from './tabs/notifications';
import LinkTab from '@gdmn-nxt/components/link-tab/link-tab';

/* eslint-disable-next-line */
export interface ProfileProps {}

export const TABS = ['account', 'security', 'notifications', 'system'] as const;
type TabIndex = typeof TABS[number];

export function Profile(props: ProfileProps) {
  const userProfile = useUserData();
  const userPermissions = usePermissions();
  const { isLoading } = useGetProfileSettingsQuery(userProfile?.id ?? -1);

  const location = useLocation();
  const [tabIndex, setTabIndex] = useState<TabIndex>(TABS[0]);

  const handleTabsChange = (event: any, newindex: TabIndex) => {
    setTabIndex(newindex);
  };

  useEffect(() => {
    setTabIndex(TABS[Number(window.location.search.replace('?tab=', '') || '0')]);
  }, [window]);

  return (
    <CustomizedCard className={styles.mainCard}>
      <CardHeader title={<Typography variant="pageHeader">Настройки</Typography>} />
      <Divider />
      <CardContent className={styles['card-content']}>
        <TabContext value={tabIndex}>
          <TabList onChange={handleTabsChange} className={styles.tabHeaderRoot}>
            <LinkTab
              label="Профиль"
              value="account"
              href="/employee/system/settings"
              icon={<PersonIcon />}
              iconPosition="start"
            />
            <LinkTab
              label="Безопасность"
              value="security"
              href="/employee/system/settings?tab=1"
              icon={<ShieldIcon />}
              iconPosition="start"
            />
            <LinkTab
              label="Уведомления"
              value="notifications"
              href="/employee/system/settings?tab=2"
              icon={<NotificationsIcon />}
              iconPosition="start"
            />
            <LinkTab
              label="Система"
              value="system"
              href="/employee/system/settings?tab=3"
              className={!userPermissions?.system?.forGroup ? styles.tabHeaderHide : ''}
              icon={<SettingsSuggestIcon />}
              iconPosition="start"
            />
            {/* <Tab
              label="Профиль"
              value="account"
              icon={<PersonIcon />}
              iconPosition="start"
            />
            <Tab
              label="Безопасность"
              value="settings"
              disabled={isLoading}
              icon={<ShieldIcon />}
              iconPosition="start"
            />
            <Tab
              label="Уведомления"
              value="notifications"
              disabled={isLoading}
              icon={<NotificationsIcon />}
              iconPosition="start"
            />
            <Tab
              label="Система"
              value="system"
              disabled={isLoading}
              className={!userPermissions?.system?.forGroup ? styles.tabHeaderHide : ''}
              icon={<SettingsSuggestIcon />}
              iconPosition="start"
            /> */}
          </TabList>
          <Divider style={{ margin: 0 }} />
          <TabPanel value="account" className={tabIndex === 'account' ? styles.tabPanel : ''}>
            <AccountTab />
          </TabPanel>
          <TabPanel value="security" className={tabIndex === 'security' ? styles.tabPanel : ''}>
            <SecurityTab />
          </TabPanel>
          <TabPanel value="notifications" className={tabIndex === 'notifications' ? styles.tabPanel : ''}>
            <NotificationsTab />
          </TabPanel>
          <PermissionsGate actionAllowed={userPermissions?.system?.PUT}>
            <TabPanel value="system" className={tabIndex === 'system' ? styles.tabPanel : ''}>
              <SystemTab />
            </TabPanel>
          </PermissionsGate>
        </TabContext>
      </CardContent>
    </CustomizedCard>
  );
}

export default Profile;
