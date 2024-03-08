import { RequestHandler } from 'express';
import { resultError } from '../../responseMessages';
import { contractsRepository } from '@gdmn-nxt/repositories/contracts/contracts';
import { cacheManager } from '@gdmn-nxt/cache-manager';
import { IContract } from '@gsbelarus/util-api-types';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);

export const getAll: RequestHandler = async(req, res) => {
  const contractType = parseInt(req.params.contractType);

  if (isNaN(contractType)) {
    return res
      .status(422)
      .send(resultError('Field contractType is not defined or is not numeric'));
  }

  try {
    const { pageSize, pageNo } = req.query;
    /** Sorting */
    const { field: sortField = 'NAME', sort: sortMode = 'ASC' } = req.query;
    /** Filtering */
    const customerId = parseInt(req.query.companyId as string);
    const { name, customers, dateRange, isActive } = req.query;
    const customerIds = customers ? (customers as string).split(',').map(Number) ?? [] : [];
    const activeOnly = (isActive as string)?.toLowerCase() === 'true';
    const period = dateRange ? (dateRange as string).split(',') : [];

    let fromRecord = 0;
    let toRecord: number;

    if (pageNo && pageSize) {
      fromRecord = Number(pageNo) * Number(pageSize);
      toRecord = fromRecord + Number(pageSize);
    };

    const cachedContracts = await cacheManager.getKey<IContract[]>('contracts') ?? [];

    const contracts = cachedContracts
      .reduce<IContract[]>((filteredArray, contract) => {
        let checkConditions = true;

        if (customerId) {
          checkConditions = checkConditions &&
            contract.customer?.ID === customerId;
        }

        if (name) {
          const lowerName = String(name).toLowerCase();
          checkConditions = checkConditions && (
            contract.NUMBER?.toLowerCase().includes(lowerName) ||
            contract.customer.NAME?.toLowerCase().includes(lowerName)
          );
        }

        if (customerIds.length > 0) {
          checkConditions = checkConditions &&
            customerIds?.includes(contract.customer.ID);
        }

        if (period.length > 0) {
          checkConditions = checkConditions &&
            dayjs(contract.DATEEND).isBetween(period[0], period[1], 'day', '[]');
        }

        if (activeOnly) {
          checkConditions = checkConditions &&
            contract.ISACTIVE;
        }

        if (checkConditions) {
          filteredArray.push({
            ...contract
          });
        }
        return filteredArray;
      }, [])
      .sort((a, b) => {
        const dataType = typeof (a[String(sortField).toUpperCase()] ?? b[String(sortField).toUpperCase()]);

        const nameA = (() => {
          const fieldValue = a[String(sortField).toUpperCase()];
          if (dataType === 'string') {
            return fieldValue?.toLowerCase() || '';
          }
          return fieldValue;
        })();

        const nameB = (() => {
          const fieldValue = b[String(sortField).toUpperCase()];
          if (typeof fieldValue === 'string') {
            return fieldValue?.toLowerCase() || '';
          }
          return fieldValue;
        })();

        if (dataType === 'string') {
          return String(sortMode).toUpperCase() === 'ASC'
            ? nameA?.localeCompare(nameB)
            : nameB?.localeCompare(nameA);
        }

        if (dataType === 'number') {
          return String(sortMode).toUpperCase() === 'ASC'
            ? nameA - nameB
            : nameB - nameA;
        }

        const dateObject = new Date(nameA);
        if (!isNaN(dateObject?.getTime())) {
          return String(sortMode).toUpperCase() === 'ASC'
            ? nameA?.getTime() - nameB?.getTime()
            : nameB?.getTime() - nameA?.getTime();
        }

        return String(sortMode).toUpperCase() === 'ASC'
          ? nameA?.localeCompare(nameB)
          : nameB?.localeCompare(nameA);
      });


    // const contracts = await contractsRepository.find(
    //   req.sessionID,
    //   {
    //     ...(!isNaN(companyId) && { usr$contactkey: companyId }),
    //     contractType
    //   });

    const contractsWitPagination = contracts.slice(fromRecord, toRecord);
    const rowCount = contracts.length;

    res
      .status(200)
      .json({
        queries: {
          contracts: contractsWitPagination,
          rowCount
        },
        _params: [{ contractType }]
      });
  } catch (error) {
    res.status(500).send(resultError(error.message));
  }
};

export const contractsController = {
  // getAllByCustomer,
  getAll
};
