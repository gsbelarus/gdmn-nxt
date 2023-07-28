import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './kanban-tasks-card.module.less';
import { ColorMode, IKanbanCard, IKanbanTask } from '@gsbelarus/util-api-types';
import CustomizedCard from '../../Styled/customized-card/customized-card';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { Box, Icon, Stack, Typography } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import KanbanEditTask from '../kanban-edit-task/kanban-edit-task';
import { useAddHistoryMutation, useAddTaskMutation, useDeleteTaskMutation, useSetCardStatusMutation, useUpdateTaskMutation } from '../../../features/kanban/kanbanApi';
import { IChanges } from '../../../pages/Managment/deals/deals';
import { UserState } from '../../../features/user/userSlice';
import useTruncate from '../../helpers/hooks/useTruncate';
import PermissionsGate from '../../Permissions/permission-gate/permission-gate';
import usePermissions from '../../helpers/hooks/usePermissions';
import ForwardIcon from '@mui/icons-material/Forward';

export interface KanbanTasksCardProps {
  card: IKanbanCard;
}

export function KanbanTasksCard(props: KanbanTasksCardProps) {
  const { card } = props;

  const truncate = useTruncate();
  const [openEditForm, setOpenEditForm] = useState(false);
  const [addTask, { isSuccess: addedTaskSuccess, data: addedTask }] = useAddTaskMutation();
  const [updateTask, { isSuccess: updatedTaskSuccess }] = useUpdateTaskMutation();
  const [deleteTask, { isSuccess: deletedTaskSuccess }] = useDeleteTaskMutation();
  const [upsertCardStatus] = useSetCardStatusMutation();

  const colorMode = useSelector((state: RootState) => state.settings.customization.colorMode);
  const userId = useSelector<RootState, number | undefined>(state => state.user.userProfile?.id);
  const contactId = useSelector<RootState, number | undefined>(state => state.user.userProfile?.contactkey);

  const userPermissions = usePermissions();

  const colorModeIsLight = useMemo(() => colorMode === ColorMode.Light, [colorMode]);

  const handleTaskEditSubmit = useCallback((task: IKanbanTask, deleting: boolean) => {
    const newTask: IKanbanTask = {
      ...task,
      USR$CARDKEY: card?.ID || -1
    };

    if (deleting) {
      deleteTask(newTask.ID);
      setOpenEditForm(false);
      return;
    };

    if (newTask.ID > 0) {
      updateTask(newTask);
      setOpenEditForm(false);
      return;
    };

    addTask(newTask);
    setOpenEditForm(false);
  }, []);

  const doubleClick = useCallback(() => {
    setOpenEditForm(true);

    const isPerformer = card.TASK?.PERFORMER?.ID === contactId;
    const isCreator = card.TASK?.CREATOR?.ID === contactId;

    if (!card.STATUS?.isRead && (isCreator || isPerformer)) {
      upsertCardStatus({
        isRead: true,
        userId,
        cardId: card.TASK!.ID
      });
    }
  }, [card]);

  const handleTaskEditCancelClick = useCallback(() => setOpenEditForm(false), []);

  const memoKanbanEditTask = useMemo(() =>
    <KanbanEditTask
      open={openEditForm}
      task={card.TASK}
      onSubmit={handleTaskEditSubmit}
      onCancelClick={handleTaskEditCancelClick}
    />,
  [openEditForm]);

  return (
    <>
      <CustomizedCard
        borders={colorModeIsLight}
        onDoubleClick={doubleClick}
        style={{
          backgroundColor: colorModeIsLight ? 'whitesmoke' : 'dimgrey',
          padding: '12px',
          cursor: 'pointer',
          ...(card?.STATUS?.hasOwnProperty('isRead') && !card?.STATUS?.isRead
            ? {
              backgroundColor: 'rgba(193, 228, 250, 0.5)',
              border: '1px solid rgb(13, 228, 250)',
            }
            : {}),
        }}
        sx={{
          '&:hover': {
            boxShadow: '0 4px 18px rgba(0,0,0,.3)'
          }
        }}
      >
        <Stack spacing={1}>
          <Stack
            direction="row"
            style={{ justifyContent: 'space-between' }}
          >
            <Typography variant="h4">{truncate(card.TASK?.USR$NAME || '', 60)}</Typography>
            <Typography
              className="number"
              variant="caption"
              color={colorModeIsLight ? 'GrayText' : 'lightgray'}
            >
              {'#' + card.TASK?.USR$NUMBER}
            </Typography>
          </Stack>

          <Box style={{ margin: 0 }}>
            <Typography
              display={!card.DEAL?.CONTACT_NAME ? 'none' : 'inline'}
              variant="h2"
              component="span"
            >
              {`${card.DEAL?.CONTACT_NAME}, `}
            </Typography>
            <Typography
              variant="caption"
              color={colorModeIsLight ? 'GrayText' : 'lightgray'}
              component="span"
              sx={{ display: 'inline' }}
            >
              {truncate(card.DEAL?.CONTACT?.NAME || '', 50)}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            color={colorModeIsLight ? 'GrayText' : 'lightgray'}
            style={card.TASK?.USR$DEADLINE && (new Date(card.TASK?.USR$DEADLINE) < new Date() ? { color: 'red', margin: 0 } :
              new Date(card.TASK?.USR$DEADLINE).getDay() === new Date().getDay() ? { color: 'orange', margin: 0 } : { margin: 0 })}
          >
            {card.TASK?.USR$DEADLINE
              ? (new Date(card.TASK?.USR$DEADLINE)).toLocaleString('default',
                {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  ...((new Date(card.TASK?.USR$DEADLINE).getHours() !== 0) && { hour: '2-digit', minute: '2-digit' }) })
              : '-/-'}
          </Typography>
          {(!!card.TASK?.PERFORMER?.NAME || !!card.TASK?.CREATOR?.NAME) &&
          <Stack
            direction="row"
            display="inline-flex"
            alignItems="center"
            spacing={0.5}
            ml={-0.2}
            style={{ margin: 0 }}
          >
            <AccountCircleIcon color="primary" fontSize="small" />
            <Typography variant="h2">
              {
                card.TASK?.CREATOR?.NAME
                  .split(' ')
                  .map((el, idx) => idx === 0 ? el : (el[0] && `${el[0]}.`))
                  ?.filter(Boolean)
                  ?.join(' ')
              }
            </Typography>
            <ForwardIcon fontSize="small"/>
            <Typography variant="h2">
              {
                card.TASK?.PERFORMER?.NAME
                  .split(' ')
                  .map((el, idx) => idx === 0 ? el : (el[0] && `${el[0]}.`))
                  ?.filter(Boolean)
                  ?.join(' ')
                  ?? 'не указан'
              }
            </Typography>
          </Stack>}
          <Typography style={{ margin: 0 }} variant="body1">{card.DEAL?.USR$NAME}</Typography>
        </Stack>
      </CustomizedCard>
      <PermissionsGate actionAllowed={userPermissions?.tasks.PUT}>
        {memoKanbanEditTask}
      </PermissionsGate>
    </>

  );
}

export default KanbanTasksCard;
