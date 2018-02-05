import _ from 'lodash';
import { metricToFormatter } from './util/Utils.js';
import Percentage from './util/Percentage.js';
import React from 'react';
import { Table } from 'antd';

/*
  Table to display Success Rate, Requests and Latency in tabs.
  Expects rollup and timeseries data.
*/

const resourceInfo = {
  "upstream_deployment": { title: "deployment", url: "/deployment?deploy=" },
  "downstream_deployment": { title: "deployment", url: "/deployment?deploy=" },
  "upstream_pod": { title: "upstream pod", url: "/pod?pod=" },
  "downstream_pod": { title: "downstream pod", url: "/pod?pod=" },
  "deployment": { title: "deployment", url: "/deployment?deploy=" },
  "pod": { title: "pod", url: "/pod?pod=" },
  "path": { title: "path", url: null }
};

const ColumnTitle = props => {
  return <div className="column-title">{props.children}</div>;
};

const columnDefinitions = (sortable = true, resource, ConduitLink) => {
  return [
    {
      title: resource.title,
      dataIndex: "name",
      key: "name",
      width: 150,
      sorter: sortable ? (a, b) => (a.name || "").localeCompare(b.name) : false,
      render: name => !resource.url ? name :
        <ConduitLink to={`${resource.url}${name}`}>{name}</ConduitLink>
    },
    {
      title: <ColumnTitle>Success<br />Rate</ColumnTitle>,
      dataIndex: "successRate",
      key: "successRateRollup",
      className: "numeric",
      sorter: sortable ? (a, b) => numericSort(a.successRate, b.successRate) : false,
      render: d => metricToFormatter["SUCCESS_RATE"](d)
    },
    {
      title: <ColumnTitle>Request<br />Rate</ColumnTitle>,
      dataIndex: "requestRate",
      key: "requestRateRollup",
      defaultSortOrder: 'descend',
      className: "numeric",
      sorter: sortable ? (a, b) => numericSort(a.requestRate, b.requestRate) : false,
      render: d => metricToFormatter["REQUEST_RATE"](d)
    },
    {
      title: <ColumnTitle>Request<br />Distribution</ColumnTitle>,
      dataIndex: "requestDistribution",
      key: "distribution",
      className: "numeric",
      sorter: sortable ? (a, b) =>
        numericSort(a.requestDistribution.get(), b.requestDistribution.get()) : false,
      render: d => d.prettyRate()
    },
    {
      title: <ColumnTitle>P99<br />Latency</ColumnTitle>,
      dataIndex: "P99",
      key: "p99LatencyRollup",
      className: "numeric",
      sorter: sortable ? (a, b) => numericSort(a.P99, b.P99) : false,
      render: metricToFormatter["LATENCY"]
    },
    {
      title: <ColumnTitle>P95<br />Latency</ColumnTitle>,
      dataIndex: "P95",
      key: "p95LatencyRollup",
      className: "numeric",
      sorter: sortable ? (a, b) => numericSort(a.P95, b.P95) : false,
      render: metricToFormatter["LATENCY"]
    },
    {
      title: <ColumnTitle>P50<br />Latency</ColumnTitle>,
      dataIndex: "P50",
      key: "p50LatencyRollup",
      className: "numeric",
      sorter: sortable ? (a, b) => numericSort(a.P50, b.P50) : false,
      render: metricToFormatter["LATENCY"]
    }
  ];
};

const numericSort = (a, b) => (_.isNil(a) ? -1 : a) - (_.isNil(b) ? -1 : b);

export default class TabbedMetricsTable extends React.Component {
  constructor(props) {
    super(props);
    this.api = this.props.api;

    this.state = {
      timeseries: {},
      rollup: this.preprocessMetrics(),
      error: '',
      lastUpdated: this.props.lastUpdated,
      pollingInterval: 10000,
      pendingRequests: false
    };
  }

  preprocessMetrics() {
    let tableData = _.cloneDeep(this.props.metrics);
    let totalRequestRate = _.sumBy(this.props.metrics, "requestRate") || 0;

    _.each(tableData, datum => {
      datum.totalRequests = totalRequestRate;
      datum.requestDistribution = new Percentage(datum.requestRate, datum.totalRequests);

      _.each(datum.latency, (value, quantile) => {
        datum[quantile] = value;
      });
    });

    return tableData;
  }

  render() {
    let resource = resourceInfo[this.props.resource];
    let columns = _.compact(columnDefinitions(this.props.sortable, resource, this.api.ConduitLink));

    return (<Table
      dataSource={this.state.rollup}
      columns={columns}
      pagination={false}
      className="conduit-table"
      rowKey={r => r.name} />);
  }
}
