import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { Permissions } from '@gsbelarus/util-api-types';

const usePermissions = () => {
  return useSelector<RootState, Permissions | undefined>(state => state.user.userProfile?.permissions);
};

export default usePermissions;
