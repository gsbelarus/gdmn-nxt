import AdapterDateFns from '@mui/lab/AdapterDateFns';
import { Box, Button, CardActions, CardContent, CardHeader, Divider, Stack, TextField, Typography } from '@mui/material';
import { DesktopDatePicker } from '@mui/x-date-pickers';
import ruLocale from 'date-fns/locale/ru';
import CustomizedCard from 'apps/gdmn-nxt-web/src/app/components/customized-card/customized-card';
import styles from './remains-by-invoices.module.less';
import { useRef, useState } from 'react';
import RemainsByInvoicesReport from '../remains-by-invoices-report/remains-by-invoices-report';
import { useGetRemainsInvoicesQuery } from 'apps/gdmn-nxt-web/src/app/features/remains-by-invoices/remainsInvoicesApi';

/* eslint-disable-next-line */
export interface RemainsByInvoicesProps {}

export function RemainsByInvoices(props: RemainsByInvoicesProps) {
  // const onDate = useRef();

  console.log('RemainsByInvoices');

  const [generate, setGenerate] = useState(false);
  const [onDate, setOnDate] = useState<Date | null>(
    new Date(),
  );

  const handleChange = (newValue: Date | null) => {
    setOnDate(newValue);
    generate && setGenerate(false);
  };

  const handleGenerate = () => {
    // setInputParams((prevState) => ({
    //   ...prevState,
    //   cutomerId: customerId,
    //   dateBegin: dates[0],
    //   dateEnd: dates[1],
    // }));

    // setGenerate(false);
    setGenerate(true);

    // scollToRef.current?.scrollIntoView();
  };

  const handelClear = () => {
    // setDates(initState.dates);
    // setCustomerId(initState.cutomerId);
    setGenerate(false);
  };

  return (
    <Stack direction="column" flex={1} spacing={2}>
      <CustomizedCard borders boxShadows>
        <CardHeader title={<Typography variant="h3">Остатки по расчётным счетам</Typography>} />
        <Divider />
        <CardContent>
            <DesktopDatePicker
              label="На дату"
              value={onDate}
              onChange={handleChange}
              renderInput={(params) => <TextField {...params} />}
            />
        </CardContent>
        <Divider />
        <CardActions style={{ padding: '16px' }}>
          <Stack direction="row" spacing={3} flex={1}>
            <Box flex={1} />
            <Button onClick={handelClear}>
                  Очистить
            </Button>
            <Button
              variant="contained"
              onClick={handleGenerate}
            >
                  Сформировать
            </Button>

          </Stack>
        </CardActions>

      </CustomizedCard>
      {generate
        ? <CustomizedCard
          borders
          boxShadows
          style={{ padding: '16px' }}
        >
          <RemainsByInvoicesReport onDate={onDate || new Date()} />
        </CustomizedCard>
        : null}

    </Stack>
  );
}

export default RemainsByInvoices;
