import { ICustomer, IFilteringData } from '@gsbelarus/util-api-types';
import { Fragment, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { clearFilterData } from '../../../store/filtersSlice';
import CustomizedDialog from '@gdmn-nxt/components/Styled/customized-dialog/customized-dialog';
import { Box, Button, CardActions, CardContent, Checkbox, FormControlLabel, Stack, TextField } from '@mui/material';
import { CustomerSelect } from '@gdmn-nxt/components/Kanban/kanban-edit-card/components/customer-select';
import { DateRangePicker, StaticDateRangePicker } from '@mui/x-date-pickers-pro';
import { DateRange } from '@mui/lab';
import dayjs, { Dayjs } from 'dayjs';

export interface ContractsFilterProps {
  open: boolean;
  filteringData: IFilteringData;
  onClose: () => void;
  onFilteringDataChange: (arg: IFilteringData) => void;
}

export function ContractsFilter({
  open,
  filteringData,
  onClose,
  onFilteringDataChange
}: ContractsFilterProps) {
  const dispatch = useDispatch();

  const [period, setPeriod] = useState<DateRange<Dayjs>>([filteringData?.dateBegin ?? null, filteringData?.dateEnd ?? null]);

  const handleOnChange = (entity: string, value: any) => {
    const newObject = { ...filteringData };
    delete newObject[entity];

    const newValue = (() => {
      if (typeof value === 'boolean' && !value) {
        return {};
      }
      if (value?.toString().length > 0) {
        return { [entity]: value };
      }
      return {};
    })();

    onFilteringDataChange({ ...newObject, ...newValue });
  };

  const filterClear = useCallback(() => {
    dispatch(clearFilterData('contracts'));
    setPeriod([null, null]);
  }, []);


  const dateRangePickerChange = async (newValue: DateRange<dayjs.Dayjs>) => {
    if (!dayjs(newValue[0])?.isValid() || !dayjs(newValue[1])?.isValid()) return;
    handleOnChange('dateRange', [newValue[0]?.toISOString(), newValue[1]?.toISOString()]);
    setPeriod([dayjs(newValue[0]), dayjs(newValue[1])]);
  };

  return (
    <CustomizedDialog
      open={open}
      onClose={onClose}
      width={400}
    >
      <CardContent style={{ flex: 1 }}>
        <Stack spacing={2}>
          <CustomerSelect
            label="Клиенты"
            placeholder="Выберите клиента"
            multiple
            value={filteringData?.customers as ICustomer[] ?? []}
            onChange={(value) => handleOnChange('customers', value)}
          />
          <DateRangePicker
            value={period}
            onChange={dateRangePickerChange}
            renderInput={(startProps: any, endProps: any) => (
              <>
                <TextField {...startProps} />
                <Box sx={{ mx: 2 }}/>
                <TextField {...endProps} />
              </>
            )}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={filteringData?.isActive ?? false}
                onChange={(e) => handleOnChange('isActive', e.target.checked)}
              />
            }
            label="Только действуюшие"
          />
        </Stack>
      </CardContent>
      <CardActions style={{ padding: '16px' }}>
        <Button
          variant="contained"
          fullWidth
          onClick={() => {
            filterClear();
            onClose();
          }}
        >
            Очистить
        </Button>
      </CardActions>
    </CustomizedDialog>
  );
};
