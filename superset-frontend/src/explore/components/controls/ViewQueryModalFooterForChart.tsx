/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { FC } from 'react';
import { t, SupersetClient } from '@superset-ui/core';
import Button from 'src/components/Button';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { userHasPermission } from 'src/dashboard/util/permissionUtils';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';
import { QueryFormData } from '@superset-ui/core';
import { safeStringify } from 'src/utils/safeStringify';

interface ViewQueryModalFooterForChartProps {
  closeModal?: () => void;
  formData: QueryFormData;
  sql: string;
}

const CLOSE = t('Close');
const OPEN_IN_SQL_LAB = t('Open in SQL Lab');

const ViewQueryModalFooterForChart: FC<ViewQueryModalFooterForChartProps> = ({
  closeModal,
  formData,
  sql,
}) => {
  const history = useHistory();
  const user = useSelector<any, UserWithPermissionsAndRoles | undefined>(
    state => state.user,
  );
  const canAccessSqlLab = userHasPermission(user, 'SQL Lab', 'menu_access');

  const openInSQLLab = (openInNewWindow: boolean) => {
    if (!formData.datasource || !sql) {
      return;
    }

    const payload = {
      datasourceKey: formData.datasource,
      sql,
    };

    if (openInNewWindow) {
      SupersetClient.postForm('/sqllab/', {
        form_data: safeStringify(payload),
      });
    } else {
      history.push({
        pathname: '/sqllab',
        state: {
          requestedQuery: payload,
        },
      });
    }
    closeModal?.();
  };

  // Only show SQL Lab button if user has permission AND SQL is loaded
  const showSqlLabButton = canAccessSqlLab && sql;

  return (
    <div>
      {showSqlLabButton && (
        <Button onClick={({ metaKey }) => openInSQLLab(Boolean(metaKey))}>
          {OPEN_IN_SQL_LAB}
        </Button>
      )}
      <Button
        buttonStyle="primary"
        onClick={() => {
          closeModal?.();
        }}
      >
        {CLOSE}
      </Button>
    </div>
  );
};

export default ViewQueryModalFooterForChart;

