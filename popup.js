'use strict';

function element(type) {
  const e = document.createElement(type);
  return e;
}

function div(className) {
  const d = element('div');
  d.className = className;
  return d;
}

function span(className) {
  const s = element('span');
  s.className = className;
  return s;
}

function img(url) {
  const i = element('img');
  i.src = url;
  return i;
}

function anchor(url, text) {
  const a = element('a');
  a.textContent = text;
  a.setAttribute('href', url);
  return a;
}

// In order to support multiple effects, we can provide several span classes.
// The function will create a span with the first class and the passed
// textContent. Then place than in another span, with the next class, etc.
function emojiCheckbox(name, textContent, nestedSpanClasses, onChange) {
  const checkbox = element('label');
  const buttonInput = element('input');
  buttonInput.type = 'checkbox';
  buttonInput.className = 'hide-checkbox';
  buttonInput.name = name;
  if (onChange)
    buttonInput.addEventListener('change', onChange);

  let buttonText = document.createTextNode(textContent);
  nestedSpanClasses.forEach(function(className) {
    const newElement = span(className);
    newElement.appendChild(buttonText);
    buttonText = newElement;
  });
  checkbox.appendChild(buttonInput);
  checkbox.input = buttonInput;
  checkbox.appendChild(buttonText);
  return checkbox;
}

// Use Apple Maps by default
// Apple seems to redirect to Google, so Android users should get a Google Maps
// page or app.
function mapsLink(loc) {
  return `https://maps.apple.com/?daddr=${loc.lat},${loc.lng}`;
}
function mapsPostcodeLink(code) {
  return `https://maps.apple.com/?daddr=${encodeURIComponent(code)}`;
}

async function setupPostCodeInfo(elem, p) {
  const postCodeUrl =
      `https://api.postcodes.io/postcodes?lat=${p.loc.lat}&lon=${p.loc.lng}`;
  const options = {
    referrer: 'no-referrer',
  };

  // Swallow errors
  const query_result = await fetch(postCodeUrl, options)
                           .then(x => x.json())
                           .catch(x => undefined);

  if (query_result && query_result.status == 200 && query_result.result) {
    const first_result = query_result.result[0];
    const code = first_result.postcode;
    const link = anchor(mapsPostcodeLink(code), code);
    elem.appendChild(link);
    elem.style.display = 'block';
  }
}

function checkboxHandler(state, prop, event) {
  const highlight_name = event.target.name;
  console.log(
      `Toggling highlight '${highlight_name}' (checked=${event.target.checked}) for prop ${prop.id} with event`,
      event);
  // FIXME: ugh
  const prefs = state.prefs;
  toggleNamedHighlight(state, prop, highlight_name, event.target.checked);
  updateMarkerHighlightStyle(state, prop.marker);
  savePreferences(prefs)
}

// Please don't use this
function dateForDatetimeInput(date) {
  return date.toISOString().slice(0, -1)
}
function myDateParse(date) {
  const dateRE = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2}),? (\d{1,2}):(\d{2})$/;
  const m = date.match(dateRE);
  if (m === null)
    return {
      result: 'error',
      error: `Bad date format: ${date}, use YYYY/MM/DD HH:MM`
    };

  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);

  return {result: 'ok', date: new Date(year, month, day, hour, minute)};
}

function onScheduledDateChange(state, prop, ev) {
  console.log(`onScheduledDateChange(prop.id: ${prop.id})`);
  console.log(ev);

  const datetime = ev.target.value;
  const prefs = state.prefs;
  if (datetime) {
    const parsedDate = myDateParse(ev.target.value);
    console.log(`date: ${parsedDate}`);
    if (parsedDate.result != 'ok') {
      alert(`${parsedDate.result}: ${parsedDate.error}`);
      return;
    }

    const date = roundedDate(parsedDate.date);
    scheduleVisit(prefs, prop, date);
    // Adjust the field value after rounding
    ev.target.value = ev.target.type == 'text' ? formatDate(date, true) :
                                                 dateForDatetimeInput(date);
  } else {
    unscheduleVisit(prefs, prop);
  }
  savePreferences(prefs);
}

function scheduledHandler(state, prop, input, event) {
  checkboxHandler(state, prop, event);

  // Additionally, deal with the datetime picker
  const toAdd = event.target.checked ? 'popup-scheduled-date-visible' : 'popup-scheduled-date-invisible';
  const toRemove = event.target.checked ? 'popup-scheduled-date-invisible' : 'popup-scheduled-date-visible';
  input.classList.add(toAdd);
  input.classList.remove(toRemove);
  input.disabled = !event.target.checked;
}

function roundedDate(inputDate) {
  // Don't update the provided object, copy it and update the new one
  const d = new Date(inputDate);

  let roundedMinutes = Math.round(d.getMinutes() / 15) * 15;
  d.setMinutes(roundedMinutes);

  return d;
}

function formatRoundedDate(inputDate) {
  return formatDate(roundedDate(inputDate));
}

const dateTimeFormatter = Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  month: '2-digit',
  day: '2-digit',
  year: 'numeric'
});

function formatDate(date) {
  const usefulParts =
      dateTimeFormatter.formatToParts(date).map(({type, value}) => {
        if (type == 'literal')
          return {};
        const obj = {};
        obj[type] = value;
        return obj;
      });
  const parts = Object.assign.apply({}, usefulParts);
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

// Function that builds a popup for a marker.
function propertyPopup(state, marker) {
  const prop = marker.property;
  const contents = div('popup-contents');

  const photos = div('popup-photos');
  contents.appendChild(photos);
  const mainPhoto = div('popup-photos-main');
  if (prop.imgs && prop.imgs[0]) {
    mainPhoto.appendChild(img(prop.imgs[0]));
    photos.appendChild(mainPhoto);
    if (prop.imgs.length == 1) {
      // Cheat and make this take the whole width since we only have a single
      // photo
      mainPhoto.style.width = '100%';
    } else {
      const otherPhotos = div('popup-photos-other');
      if (prop.imgs && prop.imgs[1])
        otherPhotos.appendChild(img(prop.imgs[1]));
      if (prop.imgs && prop.imgs[2])
        otherPhotos.appendChild(img(prop.imgs[2]));
      photos.appendChild(otherPhotos);
    }
  }

  const priceAndPhone = div('popup-price-and-phone');
  const price = span('popup-price');
  const priceStr =
      `${prop.price.display}${prop.price.qual ? ' ' + prop.price.qual : ''}`;
  price.textContent = priceStr;
  priceAndPhone.appendChild(price);

  const spacer = span('popup-spacer');
  priceAndPhone.appendChild(spacer);

  if (prop.agent) {
    const phone = span('popup-phone');
    const phoneLink = element('a');
    phoneLink.textContent = prop.agent.phone;
    phoneLink.href = `tel:${prop.agent.phone.replace(/ +/g, '')}`;
    phoneLink.appendChild(phone);
    priceAndPhone.appendChild(phoneLink);
  }
  contents.appendChild(priceAndPhone);

  const info = div('popup-info');
  contents.appendChild(info);

  if (prop.agent && prop.agent.logo) {
    const agentLogo = element('img');
    agentLogo.className = 'popup-agent-logo';
    agentLogo.src = prop.agent.logo;
    info.appendChild(agentLogo);
  }

  const description = div('popup-description');
  description.appendChild(anchor(prop.url, prop.desc));
  info.appendChild(description);

  const location = div('popup-location');
  location.appendChild(anchor(mapsLink(prop.loc), prop.addr));
  info.appendChild(location);

  const postcode = div('popup-postcode');
  postcode.style.display = 'hidden';
  setupPostCodeInfo(postcode, prop);
  info.appendChild(postcode);

  const interactiveSection = div('popup-interactive');
  const dateInput = element('input');
  dateInput.type = 'datetime-local';
  dateInput.step = 15*60;
  if (prop.scheduled)
    dateInput.value = dateForDatetimeInput(prop.scheduled);

  if (dateInput.type == 'text') {
    // Add placeholder text in Safari for macOS. In that browser, the input type
    // is not changed, as it doesn't support datetime-local (nor datetime)
    dateInput.placeholder = formatRoundedDate(new Date());

    if (prop.scheduled)
      dateInput.value = formatDate(prop.scheduled, true);
  }
  dateInput.classList.add('popup-scheduled-date');
  const scheduledStartClass = prop.highlights.indexOf('scheduled') == -1 ?
      'popup-scheduled-date-invisible' :
      'popup-scheduled-date-visible';
  dateInput.classList.add(scheduledStartClass);
  const isScheduled = prop.highlights.indexOf('scheduled') != -1;
  dateInput.disabled = !isScheduled;
  dateInput.addEventListener('change', onScheduledDateChange.bind(null, state, prop));
  interactiveSection.appendChild(dateInput);


  const buttons = span('popup-buttons');
  const scheduledCheckbox = emojiCheckbox(
      'scheduled', '📅', ['checkbox-scheduled', 'emoji-checkbox'],
      scheduledHandler.bind(null, state, prop, dateInput))
  scheduledCheckbox.input.checked = isScheduled;
  buttons.appendChild(scheduledCheckbox);
  const okCheckbox = emojiCheckbox(
      'ok', '🆗', ['checkbox-ok', 'emoji-checkbox-faded'],
      checkboxHandler.bind(null, state, prop))
  okCheckbox.input.checked = prop.highlights.indexOf('ok') != -1;
  buttons.appendChild(okCheckbox);
  const ngCheckbox = emojiCheckbox(
      'ng', '🆖', ['checkbox-ng', 'emoji-checkbox-faded'],
      checkboxHandler.bind(null, state, prop));
  ngCheckbox.input.checked = prop.highlights.indexOf('ng') != -1;
  buttons.appendChild(ngCheckbox);
  interactiveSection.appendChild(buttons);

  info.appendChild(interactiveSection);

  // Have our inputs stored in an easily accessible object.
  // The function binding the popup is in charge of deleting this prop.inputs
  // object when the popup closes to be sure we don't use some outdated inputs.
  prop.inputs = {
    ok: okCheckbox.input,
    ng: ngCheckbox.input,
    schedule: scheduledCheckbox.input,
    datetime: dateInput,
  };

  return contents;
}

function addPropertyPopup(state, map, popup, coords) {
  const contents = div('popup-contents');

  const header = div('save-popup-warning');
  contents.appendChild(header);
  const nameInput = element('input');
  nameInput.style.display = 'block';
  nameInput.placeholder = 'Name';
  contents.appendChild(nameInput);
  const streetInput = element('input');
  streetInput.style.display = 'block';
  streetInput.placeholder = 'Street';
  contents.appendChild(streetInput);
  const priceInput = element('input');
  priceInput.style.display = 'block';
  priceInput.type = 'number';
  priceInput.inputmode = 'numeric';
  priceInput.placeholder = 'Price';
  priceInput.min = 1000;
  priceInput.max = 1000000;
  priceInput.step = 500;
  contents.appendChild(priceInput);
  const phoneInput = element('input');
  phoneInput.style.display = 'block';
  phoneInput.type = 'tel';
  phoneInput.placeholder = 'Phone';
  contents.appendChild(phoneInput);
  const agentInput = element('input');
  agentInput.style.display = 'block';
  agentInput.placeholder = 'Agent';
  contents.appendChild(agentInput);
  const notesInput =  element('textarea');
  notesInput.style.display = 'block';
  notesInput.placeholder = 'Notes';
  contents.appendChild(notesInput);

  const saveButton = element('button');
  saveButton.textContent = 'Save';
  saveButton.addEventListener('click', function(ev) {
    // First validate that we have proper info
    const mandatoryInputs = [nameInput, streetInput, priceInput, phoneInput, agentInput];
    let failed = false;
    for (const input of mandatoryInputs) {
      const bad = input.value == '';
      failed = failed || bad;
      // Reset all borders, as inputs might have been "bad" and then got fixed
      // between the last click and this one.
      input.style.border = bad ? '1px red dashed' : '';
    }

    if (failed) {
      header.textContent = 'Please fill out all fields';
      return;
    }

    const prop = {id: nextPropId(state)};
    // This will JSON.stringify correctly, only yielding lat and lng properties
    prop.loc = coords;
    prop.price = {display: `£ ${priceInput.value}`};
    prop.agent = {phone: phoneInput.value};
    prop.url = '#';
    prop.desc = nameInput.value;
    prop.addr = streetInput.value;
    prop.summary = notesInput.value;
    prop.editable = true;

    addPropertyManually(state, map, prop);
    popup.remove();
  });
  contents.appendChild(saveButton);

  return contents;
}
