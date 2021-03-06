///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
import map from 'lodash/map';
import isObject from 'lodash/isObject';
import filter from 'lodash/filter';
import isUndefined from 'lodash/isUndefined';

export class GenericDatasource {

  name: string;
  url: string;
  q: any;
  backendSrv: any;
  templateSrv: any;
  withCredentials: boolean;
  headers: any;

  /** @ngInject **/
  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.name = instanceSettings.name;
    this.url = instanceSettings.url;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.withCredentials = instanceSettings.withCredentials;
    this.headers = { 'Content-Type': 'application/json' };
    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
      this.headers['Authorization'] = instanceSettings.basicAuth;
    }
  }

  query(options) {
    const query = this.buildQueryParameters(options);
    query.targets = query.targets.filter(t => !t.hide);

    if (query.targets.length <= 0) {
      return this.q.when({ data: [] });
    }

    if (this.templateSrv.getAdhocFilters) {
      query.adhocFilters = this.templateSrv.getAdhocFilters(this.name);
    } else {
      query.adhocFilters = [];
    }

    const index = isUndefined(this.templateSrv.index) ? {} : this.templateSrv.index;
    const variables = {};
    Object.keys(index).forEach((key) => {
      const variable = index[key];
      variables[variable.name] = {
        text: variable.current.text,
        value: variable.current.value,
      };
    });

    options.scopedVars = { ...variables, ...options.scopedVars };

    return this.doRequest({
      url: this.url + '/query',
      data: query,
      method: 'POST',
    });
  }

  testDatasource() {
    return this.doRequest({
      url: this.url + '/',
      method: 'GET',
    }).then((response) => {
      if (response.status === 200) {
        return { status: 'success', message: 'Data source is working', title: 'Success' };
      }

      return {
        status: 'error',
        message: 'Data source is not working: ' + response.message,
        title: 'Error',
      };
    });
  }

  annotationQuery(options) {
    const query = this.templateSrv.replace(options.annotation.query, {}, 'glob');
    const annotationQuery = {
      range: options.range,
      annotation: {
        query,
        name: options.annotation.name,
        datasource: options.annotation.datasource,
        enable: options.annotation.enable,
        iconColor: options.annotation.iconColor,
      },
      rangeRaw: options.rangeRaw,
    };

    return this.doRequest({
      url: this.url + '/annotations',
      method: 'POST',
      data: annotationQuery,
    }).then((result) => {
      return result.data;
    });
  }

  metricFindQuery(query) {
    const interpolated = {
      target: this.templateSrv.replace(query, null, 'regex'),
    };

    return this.doRequest({
      url: this.url + '/search',
      data: interpolated,
      method: 'POST',
    }).then(this.mapToTextValue);
  }

  mapToTextValue(result) {
    return map(result.data, (d, i) => {
      if (d && d.text && d.value) {
        return { text: d.text, value: d.value };
      }

      if (isObject(d)) {
        return { text: d, value: i };
      }
      return { text: d, value: d };
    });
  }

  doRequest(options) {
    options.withCredentials = this.withCredentials;
    options.headers = this.headers;

    return this.backendSrv.datasourceRequest(options);
  }

  buildQueryParameters(options) {
    // remove placeholder targets
    options.targets = filter(options.targets, (target) => {
      return target.target !== 'select metric';
    });

    options.targets = map(options.targets, (target) => {
      let data = target.data;

      if (typeof data === 'string' && data.trim() === '') {
        data = null;
      }

      if (data) {
        data = JSON.parse(data);
      }

      this.templateSrv.replace(target.target, options.scopedVars, 'regex');

      return {
        data,
        target: this.templateSrv.replace(target.target, options.scopedVars, 'regex'),
        refId: target.refId,
        hide: target.hide,
        type: target.type || 'timeseries',
      };
    });

    return options;
  }

  getTagKeys(options) {
    return new Promise((resolve, reject) => {
      this.doRequest({
        url: this.url + '/tag-keys',
        method: 'POST',
        data: options,
      }).then((result) => {
        return resolve(result.data);
      });
    });
  }

  getTagValues(options) {
    return new Promise((resolve, reject) => {
      this.doRequest({
        url: this.url + '/tag-values',
        method: 'POST',
        data: options,
      }).then((result) => {
        return resolve(result.data);
      });
    });
  }

}
