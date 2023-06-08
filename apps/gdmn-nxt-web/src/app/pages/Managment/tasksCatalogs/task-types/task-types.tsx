import CustomizedCard from 'apps/gdmn-nxt-web/src/app/components/Styled/customized-card/customized-card';
import styles from './task-types.module.less';
import { Button, CardContent, CardHeader, Divider, Stack, TextField, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import StyledGrid from 'apps/gdmn-nxt-web/src/app/components/Styled/styled-grid/styled-grid';
import { GridActionsCellItem, GridColumns, GridEditInputCell, GridPreProcessEditCellProps, GridRenderCellParams, GridRenderEditCellParams, GridRowParams, GridToolbarContainer, MuiEvent, useGridApiContext, useGridApiRef } from '@mui/x-data-grid-pro';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { ChangeEvent, MouseEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAddTaskTypeMutation, useDeleteTaskTypeMutation, useGetTaskTypesQuery, useUpdateTaskTypeMutation } from 'apps/gdmn-nxt-web/src/app/features/kanban/kanbanCatalogsApi';
import { ITaskType } from '@gsbelarus/util-api-types';
import ConfirmDialog from 'apps/gdmn-nxt-web/src/app/confirm-dialog/confirm-dialog';
import CardToolbar from 'apps/gdmn-nxt-web/src/app/components/Styled/card-toolbar/card-toolbar';
import { Box } from '@mui/system';
import { MouseEvent } from 'react';
import Tooltip, { tooltipClasses, TooltipProps } from '@mui/material/Tooltip';

/* eslint-disable-next-line */
export interface TaskTypesProps {}

function DetailPanelContent({ row: rowProp }: { row: ITaskType }) {
  const apiRef = useGridApiContext();

  // id: GridRowId;
  // /**
  //  * The field to put focus.
  //  */
  // fieldToFocus?: string;
  // /**
  //  * If `true`, the value in `fieldToFocus` will be deleted before entering the edit mode.
  //  */
  // deleteValue?: boolean;
  // /**
  //  * The initial value for the given `fieldToFocus`.
  //  * If `deleteValue` is also true, this value is not used.
  //  */
  // initialValue?: string;


  // id: GridRowId;
  // /**
  //  * Whether or not to ignore the modifications made on this cell.
  //  * @default false
  //  */
  // ignoreModifications?: boolean;
  // /**
  //  * The field that has focus when the editing is stopped.
  //  * Used to calculate which cell to move the focus to after finishing editing.
  //  */
  // field?: string;
  // /**
  //  * To which cell to move focus after finishing editing.
  //  * Only works if the field is also specified, otherwise focus stay in the same cell.
  //  * @default "none"
  //  */
  // cellToFocusAfter?: 'none' | 'below' | 'right' | 'left';

  const updateRow = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // rowProp.NAME = e.target.value ;
    apiRef.current.startRowEditMode({
      id: rowProp.ID,
      fieldToFocus: 'NAME'
    });
    apiRef.current.updateRows([
      { ...rowProp, NAME: e.target.value },
    ]);
    apiRef.current.stopRowEditMode({
      id: rowProp.ID,
    });
  }, [apiRef, rowProp]);

  const initState = apiRef.current.state;

  // updateRow();


  // apiRef.current.restoreState(initState);

  // const formik = useFormik<ITaskType>({
  //   enableReinitialize: true,
  //   validateOnBlur: false,
  //   initialValues: {
  //     ...rowProp
  //   },
  //   validationSchema: yup.object().shape({
  //     NAME: yup
  //       .string()
  //       .required('')
  //       .max(40, 'Слишком длинное наименование'),
  //   }),
  //   onSubmit: (value) => {
  //     // if (!confirmOpen) {
  //     //   setConfirmOpen(true);
  //     //   return;
  //     // };
  //     // setConfirmOpen(false);
  //   }
  // });

  return (
    <Stack direction="row" spacing={2}>
      {/* <FormikProvider value={formik}>
        <Form id="taskTypes" onSubmit={formik.handleSubmit}> */}
      <TextField
        style={{ flex: 0.5 }}
        // name="NAME"
        // value={formik.values.NAME}
        // onChange={formik.handleChange}
        value={rowProp.NAME}
        onChange={updateRow}
        label="Наименование"
      />
      <TextField
        value={rowProp.DESCRIPTION}
        name="DESCRIPTION"
        style={{ flex: 1 }}
        // onChange={() => apiRef.current.restoreState(initState)}
        label="Описание"
      />
      {/* </Form>
      </FormikProvider> */}
    </Stack>
  );
}

export function TaskTypes(props: TaskTypesProps) {
  const { data: taskTypes = [], isFetching, isLoading } = useGetTaskTypesQuery();
  const [insertTaskType] = useAddTaskTypeMutation();
  const [updateTaskType, { isLoading: updateTaskTypeIsLoading }] = useUpdateTaskTypeMutation();
  const [deleteTaskType, { isLoading: deleteTaskTypeIsLoading }] = useDeleteTaskTypeMutation();
  const [titleAndMethod, setTitleAndMethod] = useState<{title: string, method: () => void}>({ title: '', method: () => {} });
  const handleSetTAM = (title: string, method: () => void) => {
    setTitleAndMethod({ title, method });
  };
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errors, setErrors] = useState<{[prop: number]: {name?: string, description?: string};}>({});

  const validation = {
    name: (value: string, id: number) => {
      if (!value || value === '') {
        const newErrors = errors;
        if (newErrors[Number(id)]) {
          newErrors[Number(id)].name = 'Не может быть пустым' ;
        } else {
          newErrors[Number(id)] = { name: 'Не может быть пустым' };
        }
        setErrors(newErrors);
        return false;
      }
      return true;
    },
    description: (value: string, id: number) => {
      if (!value || value === '') {
        const newErrors = errors;
        if (newErrors[Number(id)]) {
          newErrors[Number(id)].description = 'Не может быть пустым' ;
        } else {
          newErrors[Number(id)] = { description: 'Не может быть пустым' };
        }
        setErrors(newErrors);
        return false;
      }
      return true;
    },
    clearError: (id: number) => {
      const error = errors;
      delete error[id];
      setErrors(error);
    },
  };


  const handleSubmit = useCallback((taskType: ITaskType) => {
    if (taskType.ID > 0) {
      updateTaskType(taskType);
    } else {
      insertTaskType(taskType);
    };
  }, []);

  const handleAddClick = () => {
    const id = 0;
    apiRef.current.updateRows([{ ID: id, isNew: true }]);
    apiRef.current.setRowIndex(id, 0);
    apiRef.current.scrollToIndexes({
      rowIndex: 0,
    });
    apiRef.current.setRowMode(id, 'edit');
    // Wait for the grid to render with the new row
    setTimeout(() => {
      apiRef.current.scrollToIndexes({
        rowIndex: 0,
      });
      apiRef.current.setCellFocus(id, 'name');
    }, 150);
  };

  function RowMenuCell(props: GridRenderEditCellParams) {
    const { api, id } = props;
    const isInEditMode = api.getRowMode(id) === 'edit';

    const handleEditClick = (event: any) => {
      event.stopPropagation();
      api.setRowMode(id, 'edit');
    };

    const handleConfirmSave = (event: any) => {
      const row = api.getRow(id);
      const value = api.getRowElement(id).children[0].children[0].children[0].value;
      if (!validation.name(value, Number(id))) {
        return;
      } else {
        validation.clearError(Number(id));
      }
      event.stopPropagation();
      if (row!.isNew) {
        handleSetTAM('Сохранение нового типа задач', handleSaveClick);
      } else {
        handleSetTAM('Редактирование типа задач', handleSaveClick);
      }
      setConfirmOpen(true);
    };

    const handleSaveClick = () => {
      api.commitRowChange(id);
      api.setRowMode(id, 'view');
      setConfirmOpen(false);
      const row = api.getRow(id);
      if (row!.isNew) delete row['ID'];
      handleSubmit(row);
      api.setRowMode(id, 'view');
    };

    const handleConfirmDelete = (event: any) => {
      event.stopPropagation();
      handleSetTAM('Удаление типа задач', handleDeleteClick);
      setConfirmOpen(true);
    };

    const handleDeleteClick = () => {
      setConfirmOpen(false);
      deleteTaskType(Number(id));
    };

    const handleCancelClick = () => {
      api.setRowMode(id, 'view');

      const row = api.getRow(id);
      if (row!.isNew) {
        api.updateRows([{ ID: id, _action: 'delete' }]);
      }
    };

    if (isInEditMode) {
      return (<>
        <GridActionsCellItem
          icon={<SaveIcon />}
          label="Save"
          onClick={handleConfirmSave}
          color="primary"
        />
        <GridActionsCellItem
          icon={<CancelIcon />}
          label="Cancel"
          className="textPrimary"
          onClick={handleCancelClick}
          color="primary"
        />
      </>);
    }

    return (
      <>
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          className="textPrimary"
          onClick={handleEditClick}
          color="primary"
        />
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={handleConfirmDelete}
          color="primary"
        />
      </>
    );
  }

  const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
    <Tooltip {...props} classes={{ popper: className }} />
  ))(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
      backgroundColor: theme.palette.error.main,
      color: theme.palette.error.contrastText,
    },
  }));

  const columns: GridColumns = [
    {
      field: 'NAME',
      headerName: 'Наименование',
      editable: true,
      flex: 0.5,
      renderEditCell: (props: GridRenderEditCellParams) => {
        const { id } = props;

        const error = errors[Number(id)];
        return (
          <StyledTooltip open={!!error} title={error?.name}>
            <GridEditInputCell
              {...props}
              onBlur={(e: any) => {
                if (validation.name(e.target.value, Number(id))) {
                  validation.clearError(Number(id));
                }
              }}
            />
          </StyledTooltip>
        );
      }
    },
    { field: 'DESCRIPTION', editable: true, headerName: 'Описание', flex: 1, },
    {
      field: 'actions',
      type: 'actions',
      resizable: false,
      renderCell: RowMenuCell
    }
  ];

  const apiRef = useGridApiRef();

  const handleRowEditStart = (
    params: GridRowParams,
    event: MuiEvent<React.SyntheticEvent>,
  ) => {
    event.defaultMuiPrevented = true;
  };

  const handleRowEditStop = (
    params: GridRowParams,
    event: any,
  ) => {
    event.defaultMuiPrevented = true;
  };

  const memoConfirmDialog = useMemo(() =>
    <ConfirmDialog
      open={confirmOpen}
      title={titleAndMethod.title}
      text="Вы уверены, что хотите продолжить?"
      confirmClick={titleAndMethod.method}
      cancelClick={() => {
        setConfirmOpen(false);
      }}
    />
  , [confirmOpen, titleAndMethod]);

  return (
    <>
      {memoConfirmDialog}
      <CustomizedCard
        borders
        className={styles.card}
      >

        <CardHeader title={<Typography variant="h3">Типы задач</Typography>} />
        <Divider />
        <CardToolbar>
          <Stack direction="row">
            <Box flex={1} />
            <Button
              variant="contained"
              disabled={isFetching}
              onClick={handleAddClick}
            >
            Добавить
            </Button>
          </Stack>
        </CardToolbar>
        <CardContent
          className={styles.cardContent}
        >
          <StyledGrid
            editMode="row"
            rows={taskTypes}
            columns={columns}
            loading={isLoading}
            rowHeight={80}
            apiRef={apiRef}
            onRowEditStart={handleRowEditStart}
            onRowEditStop={handleRowEditStop}
            hideHeaderSeparator
            hideFooter
          />
        </CardContent>
      </CustomizedCard>
    </>
  );
}

export default TaskTypes;
