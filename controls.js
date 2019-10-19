// With some code from Leaflet.Control.Zoom

const Schedule = L.Control.extend({
  options: {position: 'topright', title: 'Scheduled visits'},

  onAdd: function(map) {
    console.log('adding');
    const options = this.options;
    // Piggy-back on the layers control class
    const container = L.DomUtil.create('div', 'schedule-control leaflet-control-layers');
    this._container = container;
    this._button = this._createButton(options.title, container, this._openSchedule);

    this._map.on('click', this._minimize, this);
    return container;
  },

  onRemove: function(map) {
    console.log('removing');
  },

  _closeSchedule: function(ev) {},

  _createButton: function(title, container, func) {
    const link = L.DomUtil.create('a', 'schedule-control-link', container);
    link.href = '#';
    link.title = title;

    // From Control.Zoom, let's just use the same
    L.DomEvent.disableClickPropagation(link);
    L.DomEvent.on(link, 'click', L.DomEvent.stop);
    L.DomEvent.on(link, 'click', func, this);

    return link;
  },

  _minimize: function(ev) {
    if (this._scheduleDiv)
      this._toggleVisibility(this._button, this._scheduleDiv);
  },

  _openSchedule: function(ev) {
    console.log(ev);

    if (this._scheduleDiv) {
      this._updateSchedule();
      this._toggleVisibility(this._scheduleDiv, this._button);
      return;
    }

    this._updateSchedule();
    const sched = L.DomUtil.create('div', 'schedule-div', this._container)
    sched.addEventListener('click', ev => this._minimize(ev), this);
    const placeholder = L.DomUtil.create('div', 'schedule-placeholder', sched);
    placeholder.textContent = 'Hello!';

    this._scheduleDiv = sched;

    this._toggleVisibility(this._scheduleDiv, this._button);
  },

  _toggleVisibility: function(makeVisible, makeInvisible) {
    for (const name
             of ['schedule-control-visible', 'schedule-control-invisible']) {
      L.DomUtil.removeClass(makeVisible, name);
      L.DomUtil.removeClass(makeInvisible, name);
    }

    L.DomUtil.addClass(makeVisible, 'schedule-control-visible');
    L.DomUtil.addClass(makeInvisible, 'schedule-control-invisible');
  },

  _updateSchedule: function() {},
});

L.control.schedule = function (options) {
  return new Schedule(options);
}
