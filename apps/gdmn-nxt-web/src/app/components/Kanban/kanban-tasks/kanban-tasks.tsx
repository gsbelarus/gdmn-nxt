import { IKanbanCard, IKanbanTask } from '@gsbelarus/util-api-types';
import { Box, Button, Checkbox, Grid, IconButton, Stack, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { DataGridPro, GridColDef, GridColumns, ruRU } from '@mui/x-data-grid-pro';
import CustomNoRowsOverlay from '../../Styled/styled-grid/DataGridProOverlay/CustomNoRowsOverlay';
import CustomizedCard from '../../Styled/customized-card/customized-card';
import styles from './kanban-tasks.module.less';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAddHistoryMutation, useAddTaskMutation, useDeleteTaskMutation, useGetTasksQuery, useUpdateTaskMutation } from '../../../features/kanban/kanbanApi';
import KanbanEditTask from '../kanban-edit-task/kanban-edit-task';
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IChanges } from '../../../pages/Managment/deals/deals';
import { useSelector } from 'react-redux';
import { UserState } from '../../../features/user/userSlice';
import { RootState } from '../../../store';
import StyledGrid from '../../Styled/styled-grid/styled-grid';
import CustomLoadingOverlay from '../../Styled/styled-grid/DataGridProOverlay/CustomLoadingOverlay';
import { FormikProps } from 'formik';

const useStyles = makeStyles(() => ({
  dataGrid: {
    border: 'none',
    '& ::-webkit-scrollbar': {
      width: '10px',
      height: '10px',
      backgroundColor: 'transparent',
      borderRadius: '6px'
    },
    '& ::-webkit-scrollbar:hover': {
      backgroundColor: '#f0f0f0',
    },
    '& ::-webkit-scrollbar-thumb': {
      position: 'absolute',
      right: 10,
      borderRadius: '6px',
      backgroundColor: 'rgba(170, 170, 170, 0.5)',
    },
    '& ::-webkit-scrollbar-thumb:hover': {
      backgroundColor: '#999',
    },
    '& .MuiTypography-root, .MuiBox-root': {
      fontSize: '0.8rem'
    },
    '& .MuiDataGrid-renderingZone': {
      maxHeight: 'none !important'
    },
    '& .MuiDataGrid-cell': {
      lineHeight: 'unset !important',
      maxHeight: 'none !important',
      whiteSpace: 'normal'
    },
    '& .MuiDataGrid-row': {
      maxHeight: 'none !important'
    },
    '& .MuiDataGrid-iconSeparator': {
       display: 'none'
    },
  },
}));

export interface KanbanTasksProps {
  card?: IKanbanCard;
  formik: FormikProps<IKanbanCard>;
}

export function KanbanTasks(props: KanbanTasksProps) {
  const { card, formik } = props;

  const classes = useStyles();

  const [openEidtForm, setOpenEditForm] = useState(false);

  const { data: tasks = [], refetch, isFetching } = useGetTasksQuery(card?.ID || -1);
  const [addTask, { isSuccess: addedTaskSuccess, data: addedTask }] = useAddTaskMutation();
  const [updateTask, { isSuccess: updatedTaskSuccess }] = useUpdateTaskMutation();
  const [deleteTask, { isSuccess: deletedTaskSuccess }] = useDeleteTaskMutation();
  const [addHistory] = useAddHistoryMutation();
  const user = useSelector<RootState, UserState>(state => state.user);

  const changes = useRef<IChanges[]>([]);

  const currentTask = useRef<IKanbanTask | undefined>();

  const setTask = (task?: IKanbanTask) => {
    currentTask.current = task;
  };

  useEffect(() => {
    /** Надо сообщить формику, что мы изменили задачи */
    if (isFetching) return;

    if (updatedTaskSuccess || deletedTaskSuccess) {
      formik.setFieldValue('TASKS', [...tasks]);
    }
  }, [isFetching, updatedTaskSuccess, deletedTaskSuccess]);

  useEffect(() => {
    if ((updatedTaskSuccess) && changes.current.length > 0) {
      changes.current.forEach(item =>
        addHistory({
          ID: -1,
          USR$CARDKEY: card?.ID || -1,
          USR$TYPE: '2',
          USR$DESCRIPTION: item.fieldName,
          USR$OLD_VALUE: item.oldValue?.toString() || '',
          USR$NEW_VALUE: item.newValue?.toString() || '',
          USR$USERKEY: user.userProfile?.id || -1
        })
      );

      changes.current = [];
    };
  }, [updatedTaskSuccess]);

  useEffect(() => {
    if (addedTaskSuccess && addedTask) {
      changes.current.forEach(item =>
        addHistory({
          ID: -1,
          USR$CARDKEY: item.id,
          USR$TYPE: '1',
          USR$DESCRIPTION: item.fieldName,
          USR$OLD_VALUE: item.oldValue?.toString() || '',
          USR$NEW_VALUE: item.newValue?.toString() || '',
          USR$USERKEY: user.userProfile?.id || -1
        })
      );

      changes.current = [];
    };
  }, [addedTaskSuccess, addedTask]);

  useEffect(() => {
    if ((deletedTaskSuccess) && changes.current.length > 0) {
      changes.current.forEach(item =>
        addHistory({
          ID: -1,
          USR$CARDKEY: item.id,
          USR$TYPE: '3',
          USR$DESCRIPTION: item.fieldName,
          USR$OLD_VALUE: item.oldValue?.toString() || '',
          USR$NEW_VALUE: item.newValue?.toString() || '',
          USR$USERKEY: user.userProfile?.id || -1
        })
      );

      changes.current = [];
    };
  }, [deletedTaskSuccess]);

  const compareTasks = useCallback((newTask: IKanbanTask, oldTask: IKanbanTask) => {
    const changesArr: IChanges[] = [];

    const creator = newTask.CREATOR;
    const performer = newTask.PERFORMER;

    if (creator?.ID !== oldTask.CREATOR?.ID) {
      changesArr.push({
        id: card?.ID || -1,
        fieldName: `Постановщик задачи "${newTask.USR$NAME}"`,
        oldValue: oldTask.CREATOR?.NAME,
        newValue: creator?.NAME
      });
    };

    if (performer?.ID !== oldTask?.PERFORMER?.ID) {
      changesArr.push({
        id: card?.ID || -1,
        fieldName: `Исполнитель задачи "${newTask.USR$NAME}"`,
        oldValue: oldTask?.PERFORMER?.NAME,
        newValue: performer?.NAME
      });
    };

    if (newTask.USR$NAME !== oldTask.USR$NAME) {
      changesArr.push({
        id: card?.ID || -1,
        fieldName: 'Описание задачи',
        oldValue: oldTask?.USR$NAME,
        newValue: newTask?.USR$NAME
      });
    };

    if ((newTask.USR$DEADLINE || -1) !== (oldTask.USR$DEADLINE || -1)) {
      changesArr.push({
        id: card?.ID || -1,
        fieldName: `Срок выполнения задачи "${newTask.USR$NAME}"`,
        oldValue: oldTask?.USR$DEADLINE ? new Date(oldTask?.USR$DEADLINE).toLocaleString('default', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
        newValue: newTask?.USR$DEADLINE ? new Date(newTask?.USR$DEADLINE).toLocaleString('default', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
      });
    };

    return changesArr;
  }, [card]);

  const handleClosedChange = useCallback((row: IKanbanTask) => (e: ChangeEvent<HTMLInputElement>, checked: boolean) => {
    const newTask = { ...row, USR$CLOSED: checked };

    changes.current.push({
      id: newTask.ID,
      fieldName: `Задача "${newTask.USR$NAME}"`,
      oldValue: row.USR$CLOSED ? 'Выполнена' : 'Не выполнена',
      newValue: newTask.USR$CLOSED ? 'Выполнена' : 'Не выполнена',
    });

    updateTask(newTask);
  }, []);

  const handleTaskEdit = ({ row }: any) => {
    setTask(row);
    setOpenEditForm(true);
  };

  const handleTaskAdd = () => {
    setTask();
    setOpenEditForm(true);
  };

  const handleTaskEditSubmit = (task: IKanbanTask, deleting: boolean) => {
    const newTask: IKanbanTask = {
      ...task,
      USR$CARDKEY: card?.ID || -1
    };

    if (deleting) {
      changes.current.push({
        id: card?.ID || -1,
        fieldName: 'Задача',
        oldValue: newTask.USR$NAME || '',
        newValue: newTask.USR$NAME || '',
      });
      deleteTask(newTask.ID);
      setOpenEditForm(false);
      return;
    };

    if (newTask.ID > 0) {
      changes.current = compareTasks(newTask, currentTask.current!);

      updateTask(newTask);
      setOpenEditForm(false);
      return;
    };

    changes.current.push({
      id: card?.ID || -1,
      fieldName: 'Задача',
      oldValue: '',
      newValue: newTask.USR$NAME || '',
    });

    addTask(newTask);
    setOpenEditForm(false);
  };

  const handleTaskEditCancelClick = () => {
    setOpenEditForm(false);
  };

  const columns: GridColumns = useMemo(() => [
    { field: 'USR$CLOSED', headerName: '', width: 50, align: 'center',
      renderCell: ({ value, row }) => <Checkbox checked={value} onChange={handleClosedChange(row)}/> },
    { field: 'USR$NAME', headerName: 'Описание', flex: 1, minWidth: 100,
      renderCell: ({ value }) => <Box style={{ width: '100%', whiteSpace: 'initial' }}>{value}</Box>
    },
    { field: 'USR$DEADLINE', headerName: 'Срок', width: 80,
      renderCell: ({ value }) =>
        <Stack direction="column">
          <Typography>{value && (new Date(value)?.toLocaleString('default', { day: '2-digit', month: '2-digit', year: 'numeric' }))}</Typography>
          <Typography>{value && (new Date(value)?.toLocaleString('default', { hour: '2-digit', minute: '2-digit' }))}</Typography>
        </Stack>
    },
    { field: 'USR$DATECLOSE', headerName: 'Закрыта', width: 80,
      renderCell: ({ value }) =>
        <Stack direction="column">
          <Typography>{value && (new Date(value)?.toLocaleString('default', { day: '2-digit', month: '2-digit', year: 'numeric' }))}</Typography>
          <Typography>{value && (new Date(value)?.toLocaleString('default', { hour: '2-digit', minute: '2-digit' }))}</Typography>
        </Stack>
    },
    { field: 'USR$CREATIONDATE', headerName: 'Создана', width: 80,
      renderCell: ({ value }) =>
        <Stack direction="column">
          <Typography>{value && (new Date(value)?.toLocaleString('default', { day: '2-digit', month: '2-digit', year: 'numeric' }))}</Typography>
          <Typography>{value && (new Date(value)?.toLocaleString('default', { hour: '2-digit', minute: '2-digit' }))}</Typography>
        </Stack>
    },
    { field: 'PERFORMER', headerName: 'Исполнитель', width: 130,
      renderCell: ({ value }) => <Box style={{ width: '100%', whiteSpace: 'initial' }}>{value?.NAME}</Box>
    },
    { field: 'CREATOR', headerName: 'Создатель', width: 130,
      renderCell: ({ value }) => <Box style={{ width: '100%', whiteSpace: 'initial' }}>{value?.NAME}</Box>
    },
  ], []);

  const memoKanbanEditTask = useMemo(() =>
    <KanbanEditTask
      open={openEidtForm}
      task={currentTask.current}
      onSubmit={handleTaskEditSubmit}
      onCancelClick={handleTaskEditCancelClick}
    />,
  [openEidtForm, currentTask.current]);

  return (
    <Stack
      direction="column"
      flex="1"
      display="flex"
      spacing={1}
    >
      <Stack direction="row">
        <Box flex={1} />
        <IconButton color="primary" size="large" onClick={refetch} >
          <RefreshIcon />
        </IconButton>
        <IconButton color="primary" onClick={handleTaskAdd}>
          <AddCircleRoundedIcon />
        </IconButton>
      </Stack>
      <CustomizedCard
        borders
        style={{
          flex: 1,
        }}
      >
        {/* <StyledGrid
          className={classes.dataGrid}
          rows={tasks || []}
          columns={columns}
          loading={isFetching}
          // rowHeight={80}
          hideHeaderSeparator
        /> */}
        <DataGridPro
          className={classes.dataGrid}
          localeText={ruRU.components.MuiDataGrid.defaultProps.localeText}
          rows={tasks || []}
          getRowId={row => row.ID}
          columns={columns}
          loading={isFetching}
          pagination
          rowsPerPageOptions={[20]}
          pageSize={20}
          components={{
            NoRowsOverlay: CustomNoRowsOverlay,
            LoadingOverlay: CustomLoadingOverlay,
          }}
          onRowDoubleClick={handleTaskEdit}
          hideFooter
          disableColumnSelector
          disableColumnFilter
          disableColumnResize
          disableColumnReorder
          disableColumnMenu
          disableColumnPinning
        />
      </CustomizedCard>
      {memoKanbanEditTask}
    </Stack>
  );
}

export default KanbanTasks;
