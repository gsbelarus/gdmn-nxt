import './chart-column.module.less';
import ApexCharts from 'apexcharts';
import Chart from 'react-apexcharts';
import CustomizedCard from '../../customized-card/customized-card';
import { Autocomplete, Checkbox, createFilterOptions, Grid, MenuItem, Stack, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IChartFilter, useGetSumByPeriodQuery } from '../../../features/charts/chartDataApi';
import { useGetDepartmentsQuery } from '../../../features/departments/departmentsApi';
import { IContactWithID, ICustomerContractWithID, IWorkType } from '@gsbelarus/util-api-types';
import { Box } from '@mui/system';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ChartSkeleton from '../chart-skeleton/chart-skeleton';
import LinearIndeterminate from '../../linear-indeterminate/linear-indeterminate';
import { useGetWorkTypesQuery } from '../../../features/work-types/workTypesApi';
import { useGetCustomerContractsQuery } from '../../../features/customer-contracts/customerContractsApi';
interface IPeriodType {
  id: number;
  value: string;
};

const periods: IPeriodType[] = [
  {
    id: 1,
    value: 'Месяц'
  },
  {
    id: 2,
    value: 'Год'
  }
];

const generateArrayOfYears = () => {
  const max = new Date().getFullYear();
  const min = 2000;
  const years = [];

  for (let i = max; i >= min; i--) {
    years.push(i);
  };
  years.sort();

  return years;
};

const years = generateArrayOfYears();

// interface IChartFilter {
//   [key: string]: any
// };

interface IMapOfArrays {
  [key: string]: number;
};

interface IMapOfChartData {
  [key: string]: IMapOfArrays;
};

const filterOptions = createFilterOptions({
  matchFrom: 'any',
  limit: 50,
  stringify: (option: any) => option['USR$NAME'] || option['NAME'],
});

interface IAnalyticsDataParams {
  dateBegin: number,
  dateEnd: number,
  departments?: IContactWithID[],
  workTypes?: IWorkType[]
  contracts?: ICustomerContractWithID[]
};


/* eslint-disable-next-line */
export interface ChartColumnProps {}

export function ChartColumn(props: ChartColumnProps) {
  const theme = useTheme();
  const [periodType, setPeriodType] = useState<IPeriodType | undefined>(periods[0]);
  const [activeYears, setActiveYears] = useState<number[]>(years.slice(years.length - 2));
  const [chartFilter, setChartFilter] = useState<IChartFilter>({});

  const analyticsDataParams: IAnalyticsDataParams = {
    dateBegin: new Date(activeYears.slice(0, 1)[0], 0, 1).getTime() || 0,
    dateEnd: new Date(activeYears.slice(-1)[0], 11, 31).getTime() || 0,
    ...(chartFilter['departments']?.length > 0 ? { departments: chartFilter['departments'].map((el: any) => el.ID) } : {}),
    ...(chartFilter['contracts']?.length > 0 ? { contracts: chartFilter['contracts'].map((el: any) => el.ID) } : {}),
    ...(chartFilter['workTypes']?.length > 0 ? { workTypes: chartFilter['workTypes'].map((el: any) => el.ID) } : {})
  };

  const {
    data: analyticsData,
    isLoading: analyticsDataIsLoading,
    isFetching: analyticsDataIsFetching,
    refetch: analyticsDataRefetch,
  } = useGetSumByPeriodQuery(analyticsDataParams);

  const { data: departments, isFetching: departmentsIsFetching, refetch: departmentsRefetch } = useGetDepartmentsQuery();
  const { data: workTypes, isFetching: workTypesIsFetching } = useGetWorkTypesQuery({
    contractJob: chartFilter['contracts']?.map((el: any) => el.ID)
  });
  const { data: customerContracts, isFetching: customerContractsIsFetching } = useGetCustomerContractsQuery();

  const ref = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | undefined>(0);

  useEffect(() => {
    setWidth((ref2?.current?.clientWidth || 0) - 30);
  }, [ref2?.current?.clientWidth]);

  const changeChartFilter = (key: string, value: any[]) => {
    const newChartFilter = { ...chartFilter };
    delete newChartFilter[key];

    /** При очистке выбранных заказов очищаем выбранные виды работ */
    if (key === 'contracts' && value?.length === 0) {
      delete newChartFilter['workTypes'];
    };

    /** Если были выбраны виды работ без указания заказов, то очищаем их при первичном выборе заказов */
    if (key === 'contracts' && !newChartFilter['contracts']) {
      delete newChartFilter['workTypes'];
    };
    setChartFilter({ ...newChartFilter, [key]: value });
  };

  const seriesMap: IMapOfChartData = {};

  const initialSeries: IMapOfArrays = {};

  if (periodType?.id === 1) {
    for (let index = 0; index < 12; index++) {
      initialSeries[index] = 0;
    };
  } else {
    initialSeries[0] = 0 ;
    activeYears.forEach(year =>
      seriesMap[year] = { ...initialSeries }
    );
  };

  analyticsData?.forEach(el => {
    const year = el.ONDATE.getFullYear();
    const month =
      periodType?.id === 1
        ? el.ONDATE.getMonth()
        : 0;

    if (activeYears.includes(year)) {
      if (seriesMap[year]) {
        if (!isNaN(seriesMap[year][month])) {
          seriesMap[year][month] = Math.round((seriesMap[year][month] + el.AMOUNT) * 100) / 100;
        } else {
          seriesMap[year][month] = el.AMOUNT;
        };
      } else {
        seriesMap[year] = { ...initialSeries, [month]: el.AMOUNT };
      };
    }
  });

  const series: {name?: string, data: number[]}[] = [];

  if (periodType?.id === 1) {
    for (const [key, value] of Object.entries(seriesMap)) {
      series.push({ name: key, data: Object.values(value) });
    };
  } else {
    const seriesData: number[] = [];

    for (const [key, value] of Object.entries(seriesMap)) {
      seriesData.push(Number(Object.values(value)));
    };

    series.push({ data: seriesData });
  };

  const chartCategories: string[] =
    periodType?.id === 1
      ? ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
      : activeYears.map(el => el.toString());

  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      id: 'column-bar',
      stacked: false,
      toolbar: {
        show: true,
      },
      zoom: {
        enabled: true
      }
    },
    noData: {
      text: 'Нет данных',
      align: 'center',
      verticalAlign: 'middle',
      style: {
        fontSize: '20px',
      }
    },
    xaxis: {
      categories: chartCategories,
      labels: {
        formatter: (value) => (
          isNaN(Number(value)) ? value : Number(value).toLocaleString()
        )
      }
    },
    yaxis: {
      labels: {
        formatter: (value) => {
          return value.toLocaleString();
        }
      }
    },
    tooltip: {
      theme: 'light'
    },
    plotOptions: {
      bar: {
        horizontal: periodType?.id === 2,
      }
    },
    legend: {
      fontSize: '15px',
      fontFamily: '\'Roboto\', sans-serif',
      offsetY: 5,

      labels: {
        colors: theme.color.grey[500],
      },
      markers: {
        width: 16,
        height: 16,
        radius: 5
      },
      itemMargin: {
        horizontal: 15,
        vertical: 8
      }
    },
    dataLabels: {
      enabled: false
    },
  };

  const chartData: ApexCharts.ApexOptions = {
    series
  };

  return (
    <CustomizedCard
      borders
      boxShadows
      ref={ref2}
      style={{
        flex: 1,
        display: 'flex'
      }}
    >
      <Stack direction="column" spacing={3} p={2} flex={1} display="flex">
        {analyticsDataIsLoading
          ? <ChartSkeleton />
          : <>
            <Stack direction="row" spacing={1}>
              <Typography
                variant="h1"
                onClick={() => {
                  analyticsDataRefetch();
                  departmentsRefetch();
                }}
              >Продажи по месяцам</Typography>
              <Box flex={1} />

              <TextField
                style={{
                  width: '100px'
                }}
                select
                value={periodType?.value}
                onChange={(e) => setPeriodType(periods.find(el => el.value === e.target.value))}
              >
                {periods.map((option: IPeriodType) => (
                  <MenuItem key={option.id} value={option.value}>
                    {option.value}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Grid container spacing={1} ref={ref}
                style={{
                  width: width || '100%'
                }}
            >
              <Grid item xs={4}>
              <Autocomplete
                multiple
                filterOptions={filterOptions}
                loading={departmentsIsFetching}
                options={departments || []}
                onChange={(e, value) => changeChartFilter('departments', value)}
                value={chartFilter['departments'] || []}
                getOptionLabel={option => option.NAME}
                renderOption={(props, option, { selected }) => (
                  <li {...props} key={option.ID}>
                    <Checkbox
                      icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                      checkedIcon={<CheckBoxIcon fontSize="small" />}
                      checked={selected}
                    />
                    {option.NAME}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Все отделы"
                  />
                )}
              />
              </Grid>
              <Grid item xs={4}>
              <Autocomplete

                multiple
                //fullWidth
                // style={{
                //   width: width || '100%'
                // }}
                filterOptions={filterOptions}
                loading={customerContractsIsFetching}
                options={customerContracts || []}
                onChange={(e, value) => changeChartFilter('contracts', value)}
                value={chartFilter['contracts'] || []}
                getOptionLabel={option => option.USR$NAME}
                renderOption={(props, option, { selected }) => (
                  <li {...props} key={option.ID}>
                    <Checkbox
                      icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                      checkedIcon={<CheckBoxIcon fontSize="small" />}
                      // style={{ marginRight: 8 }}
                      checked={selected}
                    />
                    {option.USR$NAME}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Все заказы"
                  />
                )}
              />
              </Grid>
              <Grid item xs={4}>
              <Autocomplete
                multiple
                filterOptions={filterOptions}
                loading={workTypesIsFetching}
                options={workTypes || []}
                onChange={(e, value) => changeChartFilter('workTypes', value)}
                value={chartFilter['workTypes'] || []}
                getOptionLabel={option => option.USR$NAME}
                renderOption={(props, option, { selected }) => (
                  <li {...props} key={option.ID}>
                    <Checkbox
                      icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                      checkedIcon={<CheckBoxIcon fontSize="small" />}
                      // style={{ marginRight: 8 }}
                      checked={selected}
                    />
                    {option.USR$NAME}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Виды работ"
                  />
                )}
              />
              </Grid>
            </Grid>
            {/* <Stack direction="row" spacing={1} sx={{ backgroundColor: 'red' }}>
              <Autocomplete
                multiple
                // fullWidth
                style={{
                  // flexGrow: 2,
                  width: '200px'
                }}
                filterOptions={filterOptions}
                loading={departmentsIsFetching}
                options={departments || []}
                onChange={(e, value) => changeChartFilter('DEPARTMENTS', value)}
                value={chartFilter['DEPARTMENTS'] || []}
                getOptionLabel={option => option.NAME}
                renderOption={(props, option, { selected }) => (
                  <li {...props} key={option.ID}>
                    <Checkbox
                      icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                      checkedIcon={<CheckBoxIcon fontSize="small" />}
                      // style={{ marginRight: 8 }}
                      checked={selected}
                    />
                    {option.NAME}
                  </li>
                )}
                noOptionsText="Не найден"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    style={{
                      flexGrow: 2,
                    }}
                    placeholder="Все отделы"
                  />
                )}
              />
              <Autocomplete
                multiple
                // fullWidth
                style={{
                  width: '200px'
                }}
                filterOptions={filterOptions}
                loading={customerContractsIsFetching}
                options={customerContracts || []}
                onChange={(e, value) => changeChartFilter('CONTRACTS', value)}
                value={chartFilter['CONTRACTS'] || []}
                getOptionLabel={option => option.USR$NAME}
                renderOption={(props, option, { selected }) => (
                  <li {...props} key={option.ID}>
                    <Checkbox
                      icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                      checkedIcon={<CheckBoxIcon fontSize="small" />}
                      // style={{ marginRight: 8 }}
                      checked={selected}
                    />
                    {option.USR$NAME}
                  </li>
                )}
                noOptionsText="Не найден"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Все заказы"
                  />
                )}
              />
              <Autocomplete
                multiple
                // fullWidth
                // style={{
                //   width: '30%'
                // }}
                filterOptions={filterOptions}
                loading={workTypesIsFetching}
                options={workTypes || []}
                onChange={(e, value) => changeChartFilter('WORKTYPES', value)}
                value={chartFilter['WORKTYPES'] || []}
                getOptionLabel={option => option.USR$NAME}
                renderOption={(props, option, { selected }) => (
                  <li {...props} key={option.ID}>
                    <Checkbox
                      icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                      checkedIcon={<CheckBoxIcon fontSize="small" />}
                      // style={{ marginRight: 8 }}
                      checked={selected}
                    />
                    {option.USR$NAME}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    style={{
                      flexGrow: 1,
                    }}
                    placeholder="Виды работ"
                  />
                )}
              />

            </Stack> */}
            <Box height="5px">
              <LinearIndeterminate open={analyticsDataIsFetching} />
            </Box>
            <Chart
              options={chartOptions}
              series={chartData.series}
              type="bar"
            />
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={[...years].sort((a, b) => b - a) || []}
              onChange={(e, value) => {
                value.sort();
                setActiveYears(value);
              }}
              value={activeYears}
              getOptionLabel={option => option.toString()}
              renderOption={(props, option, { selected }) => (
                <li {...props} key={option}>
                  <Checkbox
                    icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                    checkedIcon={<CheckBoxIcon fontSize="small" />}
                    style={{ marginRight: 8 }}
                    checked={selected}
                  />
                  {option}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Укажите годы аналитики"
                />
              )}
            />
          </>
        }
      </Stack>
    </CustomizedCard>
  );
};

export default ChartColumn;
