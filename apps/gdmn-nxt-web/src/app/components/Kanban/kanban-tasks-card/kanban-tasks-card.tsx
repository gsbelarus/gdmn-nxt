import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './kanban-tasks-card.module.less';
import { ColorMode, IKanbanCard, IKanbanTask } from '@gsbelarus/util-api-types';
import CustomizedCard from '../../Styled/customized-card/customized-card';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { Box, Stack, Typography } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import KanbanEditTask from '../kanban-edit-task/kanban-edit-task';
import { useAddHistoryMutation, useAddTaskMutation, useDeleteTaskMutation, useUpdateTaskMutation } from '../../../features/kanban/kanbanApi';
import { IChanges } from '../../../pages/Managment/deals/deals';
import { UserState } from '../../../features/user/userSlice';
import useTruncate from '../../helpers/hooks/useTruncate';
import PermissionsGate from '../../Permissions/permission-gate/permission-gate';
import usePermissions from '../../helpers/hooks/usePermissions';

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
  const colorMode = useSelector((state: RootState) => state.settings.customization.colorMode);
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
  }, []);

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

          <Box>
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
          <Typography variant="caption" color={colorModeIsLight ? 'GrayText' : 'lightgray'}>
            {card.TASK?.USR$DEADLINE
              ? (new Date(card.TASK?.USR$DEADLINE)).toLocaleString('default',
                {
                  day: '2-digit',
                  month: 'short',
                  year: '2-digit',
                  ...((new Date(card.TASK?.USR$DEADLINE).getHours() !== 0) && { hour: '2-digit', minute: '2-digit' }) })
              : '-/-'}
          </Typography>
          {!!card.TASK?.PERFORMER?.NAME &&
          <Stack
            direction="row"
            display="inline-flex"
            alignItems="center"
            spacing={0.5}
            ml={-0.2}
          >
            <AccountCircleIcon color="primary" fontSize="small" />
            <Typography variant="h2">{card.TASK?.PERFORMER?.NAME}</Typography>
          </Stack>}
          <Typography variant="body1">{card.DEAL?.USR$NAME}</Typography>
        </Stack>
      </CustomizedCard>
      <PermissionsGate actionAllowed={userPermissions?.tasks.PUT}>
        {memoKanbanEditTask}
      </PermissionsGate>
    </>

  );
}

export default KanbanTasksCard;