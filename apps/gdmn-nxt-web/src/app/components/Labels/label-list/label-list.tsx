import { Box, Button, CardContent, CardHeader, Divider, Grid, IconButton, Skeleton, Stack } from '@mui/material';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import AddIcon from '@mui/icons-material/Add';
import CustomizedCard from 'apps/gdmn-nxt-web/src/app/components/customized-card/customized-card';
import { useAddLabelMutation, useGetLabelsQuery } from 'apps/gdmn-nxt-web/src/app/features/labels';
import LabelListItem from '../label-list-item/label-list-item';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';

import styles from './label-list.module.less';
import { useState } from 'react';
import LabelListItemEdit from '../label-list-item-edit/label-list-item-edit';
import { ILabel } from '@gsbelarus/util-api-types';

/* eslint-disable-next-line */
export interface LabelListProps {}

export function LabelList(props: LabelListProps) {
  const { data: labels, isFetching: dataIsFetching, isLoading: dataIsLoading } = useGetLabelsQuery(undefined, { refetchOnMountOrArgChange: true });

  const ItemSkeleton = () => {
    return (
      <Stack direction="row" spacing={6} height={70} p={2} alignItems="center">
        <Skeleton variant="rectangular" width={60} height={20} style={{ borderRadius: '12px' }} />
        <Skeleton variant="text" height={10} width="90%" />
        <Skeleton variant="text" height={10} width="5%" />
      </Stack>
    );
  };

  const [openEditForm, setOpenEditForm] = useState(false);
  const [addLabel] = useAddLabelMutation();

  const handleOnSubmit = (label: ILabel) => {
    setOpenEditForm(false);

    addLabel(label);
  };

  const handleCancelClick = () => {
    setOpenEditForm(false);
  };

  return (
    <Stack flex={1}>
      <Stack direction="row" pb={2}>
        <Box flex={1} />
        <Button
          variant='contained'
          disabled={dataIsFetching}
          onClick={() => setOpenEditForm(true)}
        >
          Добавить
        </Button>
      </Stack>
    <CustomizedCard
      borders
    >
      <CardContent style={{ padding: 0 }}>
        {dataIsLoading
          ? [...Array(5)].map((el, idx) =>
            <div key={idx}>
              {idx !== 0 ? <Divider /> : <></>}
              <ItemSkeleton />
            </div>)
          : <PerfectScrollbar
            style={{
              maxHeight: 'calc(100vh - 185px)',
            }}
          >
            {labels?.map((label, idx) =>
              <div key={label.ID}>
                {idx !== 0 ? <Divider /> : <></>}
                <LabelListItem data={label} />
              </div>) || <></>}
          </PerfectScrollbar>
        }
        <LabelListItemEdit
          open={openEditForm}
          onSubmit={handleOnSubmit}
          onCancelClick={handleCancelClick}
        />
      </CardContent>
    </CustomizedCard>
    </Stack>
  );
}

export default LabelList;
