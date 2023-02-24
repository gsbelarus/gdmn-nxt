import { Box, Button, CardContent, CardHeader, Divider, Skeleton, Stack, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import CustomizedCard from 'apps/gdmn-nxt-web/src/app/components/Styled/customized-card/customized-card';
import { useAddLabelMutation, useGetLabelsQuery } from 'apps/gdmn-nxt-web/src/app/features/labels';
import LabelListItem from '../label-list-item/label-list-item';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import styles from './label-list.module.less';
import { useState } from 'react';
import LabelListItemEdit from '../label-list-item-edit/label-list-item-edit';
import { ILabel, IPermissionByUser } from '@gsbelarus/util-api-types';
import { usePermissions } from '../../../features/common/usePermissions';
import PermissionsGate from '../../Permissions/permission-gate/permission-gate';
import { Action } from '@gsbelarus/util-api-types';

const ItemSkeleton = () => {
  return (
    <Stack direction="row" spacing={6} height={68.5} p={2} alignItems="center">
      <Skeleton variant="rectangular" width={60} height={20} style={{ borderRadius: '12px' }} />
      <Skeleton variant="text" height={30} width={'100%'} />
    </Stack>
  );
};

const useStyles = makeStyles(() => ({
  body: {
    position: 'relative',
    maxHeight: '100%',
    minWidth: '100%',
    border: 'none',
    overflowWrap: 'normal',
  },
  scrollBarContainer: {
    paddingBottom: '20px',
    borderRadius: '12px',
    position: 'absolute',
    right: '1px',
    left: '1px',
    bottom: '0',
    top: '80px',
  }
}));

/* eslint-disable-next-line */
export interface LabelListProps {}

export function LabelList(props: LabelListProps) {
  const { data: labels, isFetching: dataIsFetching, isLoading: dataIsLoading } = useGetLabelsQuery(undefined, { refetchOnMountOrArgChange: true });

  const [openEditForm, setOpenEditForm] = useState(false);
  const [addLabel, { isLoading: addIsLoading }] = useAddLabelMutation();

  const handleOnSubmit = (label: ILabel) => {
    setOpenEditForm(false);

    addLabel(label);
  };

  const handleCancelClick = () => {
    setOpenEditForm(false);
  };

  const [isFetching5, data5] = usePermissions(5);
  const [isFetching6, data6] = usePermissions(6);
  const [isFetching7, data7] = usePermissions(7);

  const componentIsFetching = dataIsFetching || isFetching5 || isFetching6 || isFetching7 || dataIsFetching;

  const classes = useStyles();

  return (
    <div
      className={classes.body}
    >
      <CustomizedCard
        borders
        style={{ height: '100%' }}
      >
        <CardHeader
          title={componentIsFetching ? <Skeleton variant="rectangular" height={'36px'}/> : <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h3">Метки</Typography>
            <PermissionsGate actionCode={Action.CreateLabel}>
              <Button
                variant="contained"
                disabled={addIsLoading}
                onClick={() => setOpenEditForm(true)}
              >
                Добавить
              </Button>
            </PermissionsGate>
          </div>}
        />
        <Divider />
        <CardContent className={classes.scrollBarContainer}>
          <PerfectScrollbar style={{ paddingRight: '10px', pointerEvents: componentIsFetching ? 'none' : 'auto' }}>
            {componentIsFetching
              ? [...Array(10)].map((el, idx) =>
                <div key={idx}>
                  {idx !== 0 ? <Divider /> : <></>}
                  <ItemSkeleton />
                </div>)
              :
              labels?.map((label, idx) =>
                <div key={label.ID}>
                  {idx !== 0 ? <Divider /> : <></>}
                  <LabelListItem data={label} />
                </div>) || <></>

            }
          </PerfectScrollbar>
          <LabelListItemEdit
            open={openEditForm}
            onSubmit={handleOnSubmit}
            onCancelClick={handleCancelClick}
          />
        </CardContent>
      </CustomizedCard>
    </div>
  );
}

export default LabelList;
