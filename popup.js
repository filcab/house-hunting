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
function emojiCheckbox(nestedSpanClasses, textContent, onChange) {
  const checkbox = element('label');
  const buttonInput = element('input');
  buttonInput.type = 'checkbox';
  buttonInput.className = 'hide-checkbox';
  if (onChange)
    buttonInput.addEventListener('change', onChange);

  let buttonText = document.createTextNode(textContent);
  nestedSpanClasses.forEach(function(className) {
    const newElement = span(className);
    newElement.appendChild(buttonText);
    buttonText = newElement;
  });
  checkbox.appendChild(buttonInput);
  checkbox.appendChild(buttonText);
  return checkbox;
}

// Use Apple Maps by default
// Apple seems to redirect to Google, so Android users should get a Google Maps
// page or app.
function mapsLink(loc) {
  return `https://maps.apple.com/?daddr=${loc.lat},${loc.lng}`;
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

  if (query_result.status == 200) {
    const first_result = query_result.result[0];
    elem.textContent = first_result.postcode;
    elem.style.display = 'block';
  }
}

// Function that builds a popup for a marker.
function propertyPopup(marker) {
  const prop = marker.property;
  const contents = div('popup-contents');

  const photos = div('popup-photos');
  contents.appendChild(photos);
  const mainPhoto = div('popup-photos-main');
  if (prop.imgs && prop.imgs[0])
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

  const info = div('popup-info');
  contents.appendChild(info);

  const priceAndPhone = div('popup-price-and-phone');
  const price = span('popup-price');
  const priceStr =
      `${prop.price.display}${prop.price.qual ? ' ' + prop.price.qual : ''}`;
  price.textContent = priceStr;
  priceAndPhone.appendChild(price);

  const spacer = span('popup-spacer');
  priceAndPhone.appendChild(spacer);

  const phone = span('popup-phone');
  phone.textContent = prop.agent.phone;
  priceAndPhone.appendChild(phone);

  info.appendChild(priceAndPhone);

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

  const summary = div('popup-summary');
  summary.textContent = prop.summary;
  info.appendChild(summary);

  const buttons = div('popup-buttons');
  buttons.appendChild(emojiCheckbox(['checkbox-ok', 'emoji-checkbox-faded'], '🆗'));
  buttons.appendChild(emojiCheckbox(['checkbox-ng', 'emoji-checkbox-faded'], '🆖'));
  info.appendChild(buttons);

  return contents;
}
