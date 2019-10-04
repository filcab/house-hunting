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

function appleMaps(loc) {
  return `https://maps.apple.com/?daddr=${loc.lat},${loc.lng}`;
}

// Use apple maps by default
// TODO: If not on iOS/macOS, use GMaps?
const locationUrl = appleMaps;

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
  location.appendChild(anchor(locationUrl(prop.loc), prop.addr));
  info.appendChild(location);

  const summary = div('popup-summary');
  summary.textContent = prop.summary;
  info.appendChild(summary);

  return contents;
}
