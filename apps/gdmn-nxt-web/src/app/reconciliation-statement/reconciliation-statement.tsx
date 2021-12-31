import Button from '@mui/material/Button/Button';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { baseURL } from '../const';
import styles from './reconciliation-statement.module.less';

/* eslint-disable-next-line */
export interface ReconciliationStatementProps {}

export function ReconciliationStatement(props: ReconciliationStatementProps) {

  const [data, setData] = useState<any>({});
  const [refresh, setRefresh] = useState(0);

  useEffect( () => {
    axios({ method: 'get', url: '/reconciliation-statement', baseURL, withCredentials: true })
      .then( res => setData(res.data) );
  }, [refresh]);

  const { giveSum, giveSum2, saldo, saldoEnd, customerName, ourName } = useMemo( () => {
    const giveSum = data?.movement?.reduce( (p: number, l: any) => p + (l.GIVESUM ?? 0), 0);
    const giveSum2 = data?.movement?.reduce( (p: number, l: any) => p + (l.GIVESUM2 ?? 0), 0);
    const saldo = data?.saldo?.[0]?.['SALDO'] ?? 0;
    return {
      giveSum,
      giveSum2,
      saldo,
      saldoEnd: saldo + giveSum2 - giveSum,
      customerName: data?.customerAct?.[0]?.['CUSTOMER'],
      ourName: 'БелГИСС'
    }
  }, [data]);

  return (
    <div>
      {
        data && data.customerDebt ?
          <div className={styles.container}>
            <div className={styles['rs-orders-area']}>
              <div className={styles['rs-orders-table']}>
                <table>
                  <thead>
                    <tr><th>Заказ</th><th>Предоплата</th><th>Долг</th></tr>
                  </thead>
                  <tbody>
                    {
                      data?.customerDebt?.map( (d: any) =>
                        <tr key={d['USR$NUMBER']}>
                          <td>{d['USR$NUMBER']}</td>
                          <td>{d['SALDO'] <= 0 ? -d['SALDO'] : undefined}</td>
                          <td>{d['SALDO'] > 0 ? d['SALDO'] : undefined}</td>
                        </tr>
                      )
                    }
                  </tbody>
                    <tr><th>ИТОГО:</th><th></th><th></th></tr>
                    <tr><th colSpan={3}>Долг</th></tr>
                  <tfoot>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className={styles['rs-header']}>
              <table>
                <colgroup>
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '55%' }} />
                </colgroup>
                <thead>
                  <tr>
                    {['Дата акта сверки', 'Сумма долга', 'Исполнитель', 'Описание'].map( s => <th>{s}</th> )}
                  </tr>
                </thead>
                <tbody>
                  {data?.customerAct?.map( (r: any) => <tr>{['DOCUMENTDATE', 'SUMACT', 'EMPLNAME', 'USR$DESCRIPTION'].map( s => <th>{r[s]}</th> )}</tr> )}
                </tbody>
              </table>
            </div>
            <div className={styles['rs-title']}>
              <div className={styles['rs-title-first']}>
                <div>Предприятие БелГИСС</div>
                <div>Заказ: Все</div>
              </div>
              <div className={styles['rs-title-second']}>
                <div>АКТ СВЕРКИ</div>
                <div>{`взаимных расчетов между ${ourName} и ${customerName}`}</div>
                <div>{`с ${data?.params?.dateBegin} по ${data?.params?.dateEnd}`}</div>
              </div>
            </div>
            <div className={styles['rs-main-table']}>
              <table>
                <thead>
                  <tr>
                    <th>Номер</th>
                    <th>Дата</th>
                    <th colSpan={2}>Документ</th>
                    <th>Акт</th>
                    <th>Оплаты</th>
                  </tr>
                  <tr>
                    <th colSpan={4} style={{ textAlign: 'left' }}>Сальдо на начало:</th>
                    <th>{saldo > 0 ? saldo : null}</th>
                    <th>{saldo < 0 ? saldo : null}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...new Set(data.movement.map( (m: any) => m.JOBNUMBER ))].map( (j: any) => {
                    const filtered = data.movement.filter( (m: any) => m.JOBNUMBER === j );

                    return (
                      <>
                        <tr>
                          <td colSpan={6}>{j}</td>
                        </tr>
                        {
                          filtered.map( (l: any) =>
                            <tr>
                              <td>{l.NUMBER}</td>
                              <td>{l.DOCUMENTDATE}</td>
                              <td>{l.ALIAS}</td>
                              <td>{l.NAME} {l.DESCRIPTION ? `(${l.DESCRIPTION})` : null}</td>
                              <td>{l.GIVESUM2 || null}</td>
                              <td>{l.GIVESUM || null}</td>
                            </tr>
                          )
                        }
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'right' }}>{`Итого по ${j}:`}</td>
                          <td>{filtered.reduce( (p: number, l: any) => p + (l.GIVESUM2 ?? 0), 0) || null}</td>
                          <td>{filtered.reduce( (p: number, l: any) => p + (l.GIVESUM ?? 0), 0) || null}</td>
                        </tr>
                      </>
                    );
                  }
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}>{`Оборот:`}</td>
                    <td>{giveSum2 || null}</td>
                    <td>{giveSum || null}</td>
                  </tr>
                  <tr>
                    <th colSpan={4} style={{ textAlign: 'left' }}>Сальдо на конец:</th>
                    <th>{saldoEnd > 0 ? saldoEnd : null}</th>
                    <th>{saldoEnd < 0 ? saldoEnd : null}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className={styles['rs-footer']}>
              {
                saldoEnd ?
                  <div className={styles['rs-footer-first']}>
                    Долг за {saldoEnd > 0 ? customerName : ourName} на ... составляет <span style={{ borderBottom: '1px solid black' }}>{Math.abs(saldoEnd)}</span>
                  </div>
                :
                  null
              }
              <div className={styles['rs-footer-second']}></div>
              <div className={styles['rs-footer-third']}></div>
            </div>
          </div>
        :
          <div>no data</div>
      }

      <pre>
        {JSON.stringify(data, undefined, 2)}
      </pre>
      <Button onClick={ () => setRefresh(refresh + 1) }>Refresh</Button>
    </div>
  );
}

export default ReconciliationStatement;
