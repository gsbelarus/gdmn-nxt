import './business-direction-compare.module.less';
import styles from './business-direction-compare.module.less';
import CustomizedCard from '../../Styled/customized-card/customized-card';
import ApexCharts, { ApexOptions } from 'apexcharts';
import Chart from 'react-apexcharts';
import { Box, Grid, Stack, TextField, useTheme } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import ChartColumn from '../chart-column/chart-column';
import { DateRange, DateRangePicker } from '@mui/x-date-pickers-pro/DateRangePicker';
import { IChartFilter, useGetBusinessDirectionQuery } from '../../../features/charts/chartDataApi';
import { theme } from '../../../theme';

const colorsMaster = ['#4ECDC4',	'#C7F464',	'#81D4FA',	'#546E7A',	'#FD6A6A', '#33B2DF',	'#03A9F4',	'#D4526E',	'#13D8AA',	'#A5978B'];
const colorsDetail = ['#A300D6',	'#7D02EB',	'#5653FE',	'#2983FF',	'#00B1F2', '#5C4742',	'#A5978B',	'#8D5B4C',	'#5A2A27',	'#C4BBAF'];
const colorsNoData = ['#bbbbbb'];
const noDataValue = 0.12345;
const noDataLabel = 'Нет данных';

const chartOptionsDefault: ApexCharts.ApexOptions = {
  labels: ['Нет данных'],
  series: [noDataValue],
  noData: {
    text: 'Нет данных',
  },
  tooltip: {
    y: {
      formatter(value, opt) {
        if (value === noDataValue) {
          return '';
        };

        return `
        <div class="${styles['pie-tooltip-value']}">
          <span>${value}</span>
        </div>`;
      },
      title: {
        formatter(seriesName) {
          return `
          <div class="${styles['pie-tooltip-label']}">
            <span>${seriesName === noDataLabel ? 'Выберите направление' : seriesName}</span>
          </div>`;
        },
      },

    },
  },
  chart: {
    toolbar: {
      show: false,
    },
  },
  legend: {
    show: false,
    fontWeight: 600,
    position: 'top',

    markers: {

      radius: 5,
      // offsetY: 2,
    },
    // labels: {
    //   colors: theme.color.grey[500],
    // },
  },
  dataLabels: {
    enabled: false,
    style: {
      fontSize: '1em',
    }
  },
  plotOptions: {
    pie: {
      donut: {
        labels: {
          show: false,
          name: {
            show: true,
            fontSize: '2em'
          },
          value: {
            show: true,
            fontSize: '1.5em'
          }
        }
      }
    }
  }
};

interface IInitState {
  datesLeft: DateRange<Date>;
  dateRight: DateRange<Date>;
}

const onDate = new Date(2022, 7, 17);
// const onDate = new Date();
const initState: IInitState = {
  datesLeft: [
    new Date((onDate).getFullYear(), (onDate).getMonth(), 1),
    new Date((onDate).getFullYear(), (onDate).getMonth() + 1, 0)
  ],
  dateRight: [
    new Date((onDate).getFullYear(), (onDate).getMonth() - 1, 1),
    new Date((onDate).getFullYear(), (onDate).getMonth(), 0)
  ],
};

/* eslint-disable-next-line */
export interface BusinessDirectionCompareProps {}

export function BusinessDirectionCompare(props: BusinessDirectionCompareProps) {
  const theme = useTheme();
  const [selectedLeftMasterSeriesId, setSelectedLeftMasterSeriesId] = useState(-1);
  const [selectedRightMasterSeriesId, setSelectedRightMasterSeriesId] = useState(-1);

  const [datesLeft, setDatesLeft] = useState<DateRange<Date>>(initState.datesLeft);
  const [datesRight, setDatesRight] = useState<DateRange<Date>>(initState.dateRight);

  const analyticsDataParamsLeft: IChartFilter = useMemo(() => ({
    dateBegin: datesLeft[0]?.getTime() || 0,
    dateEnd: datesLeft[1]?.getTime() || 0,
  }), [datesLeft]);

  const analyticsDataParamsRight: IChartFilter = useMemo(() => ({
    dateBegin: datesRight[0]?.getTime() || 0,
    dateEnd: datesRight[1]?.getTime() || 0,
  }), [datesRight]);

  const { data: dataLeft = [], isFetching: dataLeftFetching } = useGetBusinessDirectionQuery(analyticsDataParamsLeft);
  const { data: dataRight = [], isFetching: dataRightFetching } = useGetBusinessDirectionQuery(analyticsDataParamsRight);

  const handleDataPointSelectionLeftMaster = useCallback((e: any, chart?: any, options?: any) => {
    setSelectedLeftMasterSeriesId(options.selectedDataPoints[0].length !== 0 ? options.dataPointIndex : -1);
  }, []);

  const handleDataPointSelectionRightMaster = useCallback((e: any, chart?: any, options?: any) => {
    setSelectedRightMasterSeriesId(options.selectedDataPoints[0].length !== 0 ? options.dataPointIndex : -1);
  }, []);

  const chartOptionsBarDefault: ApexCharts.ApexOptions = {
    chart: {
      id: 'column-bar',
      stacked: false,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false
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
    tooltip: {
      theme: theme.palette.mode,
      x: {
        formatter(value, opts) {
          return `
          <div class="${styles['bar-tooltip-label']}">
            <span>${value}</span>
          </div>`;
        },
      },
    },
    xaxis: {
      labels: {
        formatter: (value) => (
          isNaN(Number(value)) ? value : Number(value).toLocaleString()
        )
      }
    },
    yaxis: {
      labels: {
        formatter: (value) => (
          value.toLocaleString()
        )
      }
    },
    legend: {
      fontSize: '15px',
      fontFamily: '\'Roboto\', sans-serif',
      offsetY: 5,
      labels: {
        colors: theme.textColor,
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

  const chartOptionsLeft = useMemo(() => {
    return {
      master: {
        ... chartOptionsDefault,
        ...(dataLeft.length !== 0 ? {
          labels: dataLeft.map(d => d.name),
          series: dataLeft.map(d => d.amount),
          chart: {
            ...chartOptionsDefault.chart,
            events: {
              dataPointSelection: handleDataPointSelectionLeftMaster
            },
          },
          colors: colorsMaster
        } : {
          colors: colorsNoData
        }),
      },
      detail: {
        ... chartOptionsDefault,
        ...(dataLeft.length !== 0 && selectedLeftMasterSeriesId >= 0 ? {
          labels: dataLeft[selectedLeftMasterSeriesId]?.businessProcesses?.map(d => d.name),
          series: dataLeft[selectedLeftMasterSeriesId]?.businessProcesses?.map(d => d.amount),
          colors: colorsDetail
        } : {
          colors: colorsNoData
        }),
      },
    };
  }, [dataLeft, selectedLeftMasterSeriesId]);

  const chartOptionsRight = useMemo(() => {
    return {
      master: {
        ... chartOptionsDefault,
        ...(dataRight.length !== 0 ? {
          labels: dataRight.map(d => d.name),
          series: dataRight.map(d => d.amount),
          chart: {
            ...chartOptionsDefault.chart,
            events: {
              dataPointSelection: handleDataPointSelectionRightMaster
            },
          },
          colors: colorsMaster
        } : {
          colors: colorsNoData
        }),
      },
      detail: {
        ... chartOptionsDefault,
        ...(dataRight.length !== 0 && selectedRightMasterSeriesId >= 0 ? {
          labels: dataRight[selectedRightMasterSeriesId]?.businessProcesses?.map(d => d.name),
          series: dataRight[selectedRightMasterSeriesId]?.businessProcesses?.map(d => d.amount),
          colors: colorsDetail
        } : {
          colors: colorsNoData
        }),
      },
    };
  }, [dataRight, selectedRightMasterSeriesId]);

  const chartOptionsBar: ApexOptions = useMemo(() => ({
    ...chartOptionsBarDefault,
    series: [
      {
        name: 'Период 1',
        data: selectedLeftMasterSeriesId >= 0
          ? dataLeft[selectedLeftMasterSeriesId]?.businessProcesses?.map(d => d.amount)
          : dataLeft?.map(d => d.amount)

      },
      {
        name: 'Период 2',
        data: selectedLeftMasterSeriesId >= 0
          ? dataLeft[selectedLeftMasterSeriesId]?.businessProcesses?.map(d => dataRight[selectedLeftMasterSeriesId].businessProcesses?.find(dr => dr.name === d.name)?.amount || 0)
          : dataLeft?.map(d => dataRight.find(dr => dr.name === d.name)?.amount || 0)
      }
    ],
    xaxis: {
      ...chartOptionsBarDefault.xaxis,
      categories: selectedLeftMasterSeriesId >= 0
        ? dataLeft[selectedLeftMasterSeriesId]?.businessProcesses?.map(({ name }) => name)
        : dataLeft?.map(({ name }) => name) || ['Нет данных'],
      labels: {
        hideOverlappingLabels: false,
        trim: true,
        rotate: 0,
        style: {
          colors: theme.textColor
        }
      },
    }
  }), [dataLeft, dataRight, selectedLeftMasterSeriesId]);


  return (
    <Grid container direction="column" spacing={3}>
      <Grid item container direction={{ md: 'column', lg: 'row' }} xs={6} spacing={3} >
        <Grid item container xs={6}>
          <CustomizedCard borders style={{ flex: 1 }}>
            <Grid container direction="column">
              <Grid item p={2} xs={3} alignSelf="center">
                <DateRangePicker
                  value={datesLeft}
                  onChange={setDatesLeft}
                  renderInput={(startProps: any, endProps: any) => (
                    <>
                      <TextField {...startProps} style={{ width: '150px' }} />
                      <Box sx={{ mx: 2 }}/>
                      <TextField {...endProps} style={{ width: '150px' }} />
                    </>
                  )}
                />
              </Grid>
              <Grid item container direction="row" xs={9}>
                <Grid item xs={6} alignSelf="center">
                  <Chart
                    type="pie"
                    // height="99%"
                    // width="99%"
                    options={chartOptionsLeft.master}
                    series={chartOptionsLeft.master.series}
                  />
                </Grid>
                <Grid item xs={6} alignSelf="center">
                  <Chart
                    type="pie"
                    // height="auto"
                    options={chartOptionsLeft.detail}
                    series={chartOptionsLeft.detail.series}
                  />
                </Grid>

              </Grid>
            </Grid>
          </CustomizedCard>
        </Grid>
        <Grid item container xs={6}>
          <CustomizedCard borders style={{ flex: 1 }}>
            <Grid container direction="column" >
              <Grid item p={2} xs={3} alignSelf="center">
                <DateRangePicker
                  value={datesRight}
                  onChange={setDatesRight}
                  renderInput={(startProps: any, endProps: any) => (
                    <>
                      <TextField {...startProps} style={{ width: '150px' }} />
                      <Box sx={{ mx: 2 }}/>
                      <TextField {...endProps} style={{ width: '150px' }} />
                    </>
                  )}
                />
              </Grid>
              <Grid item container direction="row" flex={1} xs={9}>
                <Grid item xs={6} alignSelf="center" >
                  <Chart
                    type="pie"
                    // height="99%"
                    // width="99%"
                    options={chartOptionsRight.master}
                    series={chartOptionsRight.master.series}
                  />
                </Grid>
                <Grid item xs={6} alignSelf="center">
                  <Chart
                    type="pie"
                    // height="99%"
                    options={chartOptionsRight.detail}
                    series={chartOptionsRight.detail.series}
                  />
                </Grid>

              </Grid>
            </Grid>
          </CustomizedCard>
        </Grid>
      </Grid>
      <Grid item container flex={0.99} minHeight={'300px'}>
        <CustomizedCard borders style={{ flex: 1 }}>
          <Chart
            type="bar"
            height="100%"
            series={chartOptionsBar.series}
            options={chartOptionsBar}
          />
        </CustomizedCard>
      </Grid>
    </Grid>
  );
}

export default BusinessDirectionCompare;
