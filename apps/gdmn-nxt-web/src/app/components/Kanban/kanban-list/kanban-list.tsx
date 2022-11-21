import { IKanbanCard, IKanbanColumn } from '@gsbelarus/util-api-types';
import { Box, Button, ButtonProps, Chip, IconButton, Stack, Typography } from '@mui/material';
import { DataGridProProps, GridActionsCellItem, GridColDef, GridColumns, gridFilteredDescendantCountLookupSelector, GridRenderCellParams, GridRowId, GridRowParams, GridRowProps, useGridApiContext, useGridSelector } from '@mui/x-data-grid-pro';
import { useEffect, useMemo, useRef, useState } from 'react';
import CustomizedCard from '../../Styled/customized-card/customized-card';
import StyledGrid, { renderCellExpand } from '../../Styled/styled-grid/styled-grid';
import KanbanEditCard from '../kanban-edit-card/kanban-edit-card';
import styles from './kanban-list.module.less';
import EditIcon from '@mui/icons-material/Edit';
import { useAddCardMutation, useAddHistoryMutation, useDeleteCardMutation, useUpdateCardMutation } from '../../../features/kanban/kanbanApi';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PermissionsGate from '../../Permissions/permission-gate/permission-gate';
import { compareCards, IChanges } from '../../../pages/Dashboard/deals/deals';
import { RootState } from '../../../store';
import { UserState } from '../../../features/user/userSlice';
import { useSelector } from 'react-redux';

export interface KanbanListProps {
  columns?: IKanbanColumn[];
}

export function KanbanList(props: KanbanListProps) {
  const { columns = [] } = props;

  const changes = useRef<IChanges[]>([]);
  const [addCard, setAddCard] = useState(false);
  const [editCard, setEditCard] = useState(false);
  const [card, setCard] = useState<IKanbanCard>();
  const [column, setColumn] = useState<IKanbanColumn>();
  const [insertCard, { isSuccess: addCardSuccess, data: addedCard, isLoading: insertIsLoading }] = useAddCardMutation();
  const [updateCard, { isSuccess: updateCardSuccess, isLoading: updateIsLoading }] = useUpdateCardMutation();
  const [deleteCard, { isLoading: deleteIsLoading}] = useDeleteCardMutation();
  const [addHistory] = useAddHistoryMutation();
  const user = useSelector<RootState, UserState>(state => state.user);

  useEffect(()=>{
    if ((updateCardSuccess) && changes.current.length > 0) {
      changes.current.forEach(item =>
        addHistory({
          ID: -1,
          USR$CARDKEY: item.id,
          USR$TYPE: '2',
          USR$DESCRIPTION: item.fieldName,
          USR$OLD_VALUE: item.oldValue?.toString() || '',
          USR$NEW_VALUE: item.newValue?.toString() || '',
          USR$USERKEY: user.userProfile?.id || -1
        })
      );

      changes.current = [];
    };
  }, [updateCardSuccess]);

  useEffect(() => {
    if (addCardSuccess && addedCard) {
      changes.current.forEach(item =>
        addHistory({
          ID: -1,
          USR$CARDKEY: addedCard[0].ID,
          USR$TYPE: '1',
          USR$DESCRIPTION: item.fieldName,
          USR$OLD_VALUE: item.oldValue?.toString() || '',
          USR$NEW_VALUE: item.newValue?.toString() || '',
          USR$USERKEY: user.userProfile?.id || -1
        })
      );

      changes.current = [];
    };
  }, [addCardSuccess, addedCard]);

  const onEditCard = async (newCard: IKanbanCard) => {
    updateCard(newCard);

    let oldCard: IKanbanCard = newCard;
    columns.every(column => {
      const value = column.CARDS.find(card => card.ID === newCard.ID);

      if (value) {
        oldCard = value;
        return false;
      };

      return true;
    });

    changes.current = compareCards(columns, newCard, oldCard);
  };

  const onDelete = async (deletinCard: IKanbanCard) => {
    deleteCard(deletinCard.ID);
  };

  const onAddCard = async (newCard: IKanbanCard) => {
    changes.current.push({
      id: -1,
      fieldName: 'Сделка',
      oldValue: '',
      newValue: (newCard as any)['DEAL']['USR$NAME'] || ''
    });

    insertCard(newCard);
  };

  const cardHandlers = {

    handleSubmit: async (card: IKanbanCard, deleting: boolean) => {
      console.log('handleSubmit', deleting, card);
      if (deleting) {
        onDelete(card);
      } else {
        if (card.ID) {
          onEditCard(card);
        };
        if (!card.ID) {
          onAddCard(card);
        }
      };

      editCard && setEditCard(false);
      addCard && setAddCard(false);
    },
    handleCancel: async () => {
      editCard && setEditCard(false);
      addCard && setAddCard(false);
    },
    handleClose: async (e: any, reason: string) => {
      if (reason === 'backdropClick') {
        editCard && setEditCard(false);
        addCard && setAddCard(false);
      }
    },
  };


  const rows = (() => {
    const newRows: any[] = [];
    columns?.forEach(col => col.CARDS.forEach(card => newRows.push({ ...card, ...card.DEAL, ID: card.ID, hierarchy: [col.ID, card.ID] })));
    return newRows;
  })();

  const handleCardEdit = (id: any): any => () => {
    setCard(id);
    setEditCard(true);
  };

  const handleCardAdd = (columnId: number): any => () => {
    setColumn(columns.find(c => c.ID === columnId));
    setAddCard(true);
  };

  const cols: GridColumns = [
    { field: 'USR$NAME', headerName: 'Сделка', flex: 0.5, minWidth: 150,
      renderCell: (params) => renderCellExpand(params, params.value),
    },
    {
      field: 'CONTACT',
      headerName: 'Сотрудник',
      flex: 1,
      minWidth: 200,
      sortComparator: (a, b) => ('' + a?.NAME || '').localeCompare(b?.NAME || ''),
      renderCell: (params) => renderCellExpand(params, params.value?.NAME),
    },
    {
      field: 'USR$DEADLINE',
      headerName: 'Срок',
      type: 'date',
      width: 150,
      resizable: false,
      valueFormatter: ({ value }) => value ? new Date(value).toLocaleDateString() || null : null,
    },
    {
      field: 'USR$AMOUNT',
      headerName: 'Сумма',
      type: 'number',
      width: 150,
      minWidth: 100,
      valueGetter: ({ value }) => value || '',
    },
    {
      field: 'actions',
      type: 'actions',
      resizable: false,
      getActions: (params: GridRowParams) => [
        Object.keys(params.row).length > 0
          ? <GridActionsCellItem key={1} icon={<EditIcon />} onClick={handleCardEdit(params.row)} label="Edit" color="primary" />
          : <></>
      ]
    }
  ];

  const memoEditCard = useMemo(() => {
    return (
      <KanbanEditCard
        open={editCard}
        card={card}
        currentStage={columns?.find(column => column.ID === card?.USR$MASTERKEY)}
        stages={columns}
        onSubmit={cardHandlers.handleSubmit}
        onCancelClick={cardHandlers.handleCancel}
        onClose={cardHandlers.handleClose}
      />
    );
  }, [editCard]);

  const memoAddCard = useMemo(() => {
    return <KanbanEditCard
      open={addCard}
      currentStage={column}
      stages={columns}
      onSubmit={cardHandlers.handleSubmit}
      onCancelClick={cardHandlers.handleCancel}
      onClose={cardHandlers.handleClose}
    />;
  }, [addCard]);


  const isNavigationKey = (key: string) =>
    key === 'Home' ||
    key === 'End' ||
    key.indexOf('Arrow') === 0 ||
    key.indexOf('Page') === 0 ||
    key === ' ';

  const CustomGridTreeDataGroupingCell = (props: GridRenderCellParams) => {
    const { id, field, rowNode, value } = props;

    const column = columns?.find(c => c.ID === value);

    const apiRef = useGridApiContext();
    const filteredDescendantCountLookup = useGridSelector(
      apiRef,
      gridFilteredDescendantCountLookupSelector,
    );
    const filteredDescendantCount = filteredDescendantCountLookup[rowNode.id] ?? 0;

    const handleKeyDown: ButtonProps['onKeyDown'] = (event) => {
      if (event.key === ' ') {
        event.stopPropagation();
      }
      if (isNavigationKey(event.key) && !event.shiftKey) {
        apiRef.current.publishEvent('cellNavigationKeyDown', props, event);
      }
    };

    const handleClick: ButtonProps['onClick'] = (event) => {
      apiRef.current.setRowChildrenExpansion(id, !rowNode.childrenExpanded);
      apiRef.current.setCellFocus(id, field);
      event.stopPropagation();
    };

    return (
      <Box sx={{ ml: rowNode.depth * 4 }}>
        <div>
          {filteredDescendantCount > 0 ? (
            <Stack direction="row" alignItems="center">
              <PermissionsGate actionCode={1}>
                <IconButton
                  onClick={handleCardAdd(value)}
                  color="primary"
                  size="small"
                  {...(() => column?.USR$INDEX !== 0
                    ? {
                      disabled: true
                    }
                    : {})()}
                >
                  <AddCircleIcon />
                </IconButton>
              </PermissionsGate>

              <IconButton
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                size="small"
                tabIndex={-1}
              >
                {rowNode.childrenExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
              </IconButton>
              <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                mt={0.5}
              >
                <Box>
                  {column?.USR$NAME || ''}
                </Box>
                <Chip label={filteredDescendantCount} size="small" />
              </Stack>
            </Stack>
          ) : (
            <span />
          )}
        </div>
      </Box>
    );
  };

  const groupingColDef: DataGridProProps['groupingColDef'] = {
    headerName: 'Этап',
    width: 250,
    minWidth: 200,
    renderCell: (params) => <CustomGridTreeDataGroupingCell {...params} />,
  };

  const getTreeDataPath: DataGridProProps['getTreeDataPath'] = (row) => {
    return row?.hierarchy || [];
  };


  return (
    <CustomizedCard
      borders
      style={{
        flex: 1,
        marginTop: 45
      }}
    >
      <StyledGrid
        treeData
        // loading={insertIsLoading || updateIsLoading || deleteIsLoading}
        rows={rows || []}
        columns={cols}
        getTreeDataPath={getTreeDataPath}
        groupingColDef={groupingColDef}
        hideFooter
      />
      {memoEditCard}
      {memoAddCard}
    </CustomizedCard>
  );
}

export default KanbanList;
