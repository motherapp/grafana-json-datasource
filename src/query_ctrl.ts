import { QueryCtrl } from 'grafana/app/plugins/sdk';

export class GenericDatasourceQueryCtrl extends QueryCtrl {
  static templateUrl = 'partials/query.editor.html';

  private formats: any;
  private showJSON: boolean;

  /** @ngInject **/
  constructor($scope, $injector) {
    super($scope, $injector);

    this.target.target = this.target.target || 'select metric';
    this.target.type = this.target.type || 'timeseries';
    this.target.data = this.target.data || '';

    // special handling when in table panel
    if (!this.target.format) {
      this.target.format = this.panelCtrl.panel.type === 'table' ? 'table' : 'timeseries';
    }

    this.formats = [
      { text: 'Time series', value: 'timeseries' },
      { text: 'Table', value: 'table' },
    ];
    this.showJSON = false;
  }

  getOptions(query) {
    return this.datasource.metricFindQuery(query || '');
  }

  // not used
  toggleEditorMode() {
    this.target.rawQuery = !this.target.rawQuery;
  }

  onChangeInternal() {
    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }
}
