// Bookmarklet should be an immediately invoked function
// TODO: Some properties might have been removed. Maybe add some warning
// messages for that.
(function() {
'use strict';

// Common utilities
const makeAbsoluteUrl = relativeUrl => new URL(relativeUrl, window.location);

// Create a div with a label + textarea with our data
// The textarea element allows us to do a "select all" inside it easily
const divClass = 'bookmarklet-property-data';

function displayData(data, filename) {
  // First remove any old one that might be there (Browser is likely to not
  // repaint it. I've checked that it works with a sleep-like call.
  const old = document.getElementById(divClass);
  if (old != undefined) {
    const download = document.getElementById('download-link');
    if (download)
      URL.revokeObjectURL(download.href);

    old.parentElement.removeChild(old);
  }

  const div = document.createElement('div');
  div.setAttribute('id', divClass);
  const divStyle = div.style;
  divStyle.backgroundColor = 'white';
  divStyle.position = 'fixed';
  // Manually replace '%' with '%25' so the bookmarklet works
  divStyle.top = '15%25';
  divStyle.left = '10%25';
  divStyle.height = '70%25';
  divStyle.width = '80%25';
  divStyle.zIndex = 6000;
  divStyle.padding = '10px';
  divStyle.borderRadius = '15px';
  divStyle.border = '2px solid green';
  // Eh... This works well enough
  divStyle.paddingBottom = '5ex';

  const label = document.createElement('label');
  label.setAttribute('for', 'bookmarkletDataContents');
  const labelStyle = label.style;
  labelStyle.display = 'inline';
  // Manually replace '%' with '%25' so the bookmarklet works
  labelStyle.fontSize = '125%25';
  label.textContent = 'Data gathered and cleaned up. Contents:';
  div.appendChild(label);
  const dateAndDownload = document.createElement('span');
  dateAndDownload.textContent = new Date();
  dateAndDownload.style.display = 'inline';
  dateAndDownload.style.textColot = 'grey';
  dateAndDownload.style.display = 'float';
  dateAndDownload.style.float = 'right';

  const download = document.createElement('a');
  download.id = 'download-link'
  download.href = URL.createObjectURL(new Blob([data]));
  download.download = filename;
  // Use a button instead of a link, by having the button inside the <a>
  const button = document.createElement('button');
  button.textContent = 'Download';
  download.appendChild(button);
  dateAndDownload.appendChild(download);

  div.appendChild(dateAndDownload);


  const textarea = document.createElement('textarea');
  textarea.setAttribute('id', 'bookmarkletDataContents');
  const textareaStyle = textarea.style;
  // Manually replace '%' with '%25' so the bookmarklet works
  textareaStyle.width = '100%25';
  textareaStyle.height = '100%25';
  textareaStyle.boxSizing = 'border-box';
  textarea.textContent = data;
  div.appendChild(textarea);

  document.body.appendChild(div);
}

async function OnTheMarket() {
  const OTMSavedPage = '/my-account/properties/';
  if (window.location.pathname != OTMSavedPage) {
    alert('This bookmarklet only works on the "Saved Properties" page');
    return;
  }

  async function fetchId(id) {
    const obj =
        await fetch(`https://www.onthemarket.com/map/view-pin/?id=${id}`);
    return obj.json();
  }

  function mergeToCommonFormat(p, div) {
    const id = parseInt(p.id);

    // tag text has a ton of whitespace.
    const tags = div.querySelector('div.flags')
                     .textContent.split(/\r?\n/)
                     .map(x => x.trim())
                     .filter(x => x);

    const result = {
      id: id,
      imgs: [p['cover-image']],
      price: {display: p.price, qual: p['price-qualifier']},
      url: makeAbsoluteUrl(p['details-url']),
      desc: p['property-title'],
      loc: {lat: p.location.lat, lng: p.location.lon},
      addr: p.display_address,
      summary: div.querySelector('p.description').textContent.trim(),
      agent: {
        phone: div.querySelector('span.call').textContent.trim(),
        logo: p.agent['display-logo'].url,
        name: p.agent.company_name,
      },
      tags: tags,
    };
    return result;
  }

  async function fetchIdToCommon(id, propDivs) {
    const prop = await fetchId(id);
    return mergeToCommonFormat(prop, propDivs.get(id));
  }

  const propIds = dataLayer[0]['property-ids'];

  const queryResults = document.body.querySelectorAll('div.property-result');
  const to_kv = x => [x.attributes['data-instruction-id'].value, x];
  // Map over a NodeList iterator without creating a temporary array
  // https://tiffanybbrown.com/2012/10/16/iterating-and-applying-functions-to-nodelists-with-map-and-foreach/index.html
  const propDivs = new Map(Array.prototype.map.call(queryResults, to_kv));

  const objs = await Promise.all(propIds.map(prop => fetchIdToCommon(prop, propDivs)));
  displayData(JSON.stringify(objs), 'data-otm.json');
}

function RightMove() {
  // merge two properties with the same ID
  function mergeToCommonFormat(pShortlist, pData) {
    if (pData === undefined) {
      console.log(
          'pData is undefined. Property with id ' + pShortlist.propertyId +
          ' was probably removed. shortlist entry:');
      console.log(pShortlist);
      return undefined;
    }

    const rmLocToLatLng = loc => ({lat: loc.latitude, lng: loc.longitude});
    return {
      id: pShortlist.propertyId,

      // From shortlist data
      saved: pShortlist.dateSavedOn,
      imgs: pShortlist.images,
      status: pShortlist.status,

      // From map data (after fetching additional info)
      url: makeAbsoluteUrl(pData.propertyUrl),
      addr: pData.displayAddress,
      desc: pData.propertyTypeFullDescription,
      summary: pData.summary,
      addedOrReduced: pData.addedOrReduced,
      area: pData.displaySize,

      beds: pData.bedrooms,
      floorplans: pData.numberOfFloorplans,
      subType: pData.propertySubType,

      loc: rmLocToLatLng(pData.location),
      updated: {
        reason: pData.listingUpdate.listingUpdateReason,
        data: pData.listingUpdate.listingUpdateDate,
      },
      firstVisible: pData.firstVisibleDate,

      price: {
        amount: pData.price.amount,
        display: pData.price.displayPrices[0].displayPrice,
        qual: pData.price.displayPrices[0].displayPriceQualifier,
      },

      // Do we want the one to four images from the map data?
      // Maybe the mainMapImage?

      // Mixed data
      agent: {
        logo: pShortlist.agent.branchLogoUrl,

        name: pData.customer.brandTradingName,
        phone: pData.customer.contactTelephone,
        // this is weird in the shortlist
        url: makeAbsoluteUrl(pData.customer.branchLandingPageUrl),
      },
    };
  }

  // Run in the map page:
  // First convert the properties on the map into a dict: id -> {id, location}

  // First: Get the whole shortlist:
  const shortlistUrl = id =>
      'https://my.rightmove.co.uk/shortlist?channel=RES_BUY&sortBy=DATE_ADDED&orderBy=DESC&page=' +
      id;
  const shortlistFetch = id =>
      fetch(shortlistUrl(id), {credentials: 'include'}).then(x => x.json());
  const mapProperties = shortlistFetch(1).then(page1 => {
    const n_pages = page1.totalPages;
    const shortlist = page1.properties;
    console.log('got shortlist page 1');

    // Don't re-fetch the first page, pages start counting on 1
    const pages = [];
    for (let i = 2; i <= n_pages; ++i) {
      pages.push(shortlistFetch(i).then(x => x.properties));
    }

    return Promise.all(pages).then(rest => {
      console.log('got all shortlist pages');
      rest = rest.flat();
      const allProps = shortlist.concat(rest);

      return allProps;
    });
  });

  function mergeLists(props, data) {
    return props.map(p => mergeToCommonFormat(p, data.get(p.propertyId)));
  }

  mapProperties
      .then(props => {
        const idsToQuery = props.map(p => p.propertyId);
        const requests = [];
        // 25 per search seems to be the maximum
        const STEP = 25;
        for (let cursor = 0; cursor < idsToQuery.length; cursor += STEP) {
          const batch = idsToQuery.slice(cursor, cursor + STEP);
          requests.push(
              fetch(
                  '/api/_searchByIds?channel=BUY&viewType=MAP&propertyIds=' +
                  batch)
                  .then(x => x.json()));
        }
        return Promise.all(requests).then(replies => [props, replies.flat()]);
      })
      .then(things => {
        console.log('got query results');
        const [shortlist, mapData] = things;

        const idMapData = new Map();
        for (const item of mapData) idMapData.set(item.id, item);

        console.log('merging...');
        // Merge to a single list, then show it.
        return mergeLists(shortlist, idMapData).filter(Boolean);
      })
      .then(JSON.stringify)
      .then(data => displayData(data, 'data-rm.json'));
}

async function Zoopla() {
  const query = document.getElementById('mp-list').getElementsByTagName('ul');
  if (query.length != 1) {
    alert('Sorry, parsing did not work. Check console.');
    console.log(query);
    return;
  }

  const propList = Array.from(query[0].children);

  async function getDetails(detailsPageUrl) {
    const contents = await fetch(detailsPageUrl).then(x => x.text()).catch(e => '');
    if (!contents)
      return {};

    const parser = new DOMParser();
    const htmlDocument = parser.parseFromString(contents, 'text/html');
    // Hard code getting the second ld+json script, which contains most of the
    // missing details
    return JSON.parse(
        htmlDocument.querySelectorAll('script[type="application/ld+json"]')[1]
            .textContent);
  }

  async function htmlElementToCommonFormat(elem) {
    // TODO: Check "<script type="application/ld+json">" element in details page
    // for each property.
    const prop = {id: Number(elem.children[0].children[1].value)};
    // Just hard-code it
    prop.tags = [elem.children[1].textContent.trim()];

    const itemResult = elem.children[2];
    prop.price = {display: itemResult.children[0].textContent.trim()};
    let anchor = itemResult.children[1].children[0];
    let details = {};
    if (anchor) {
      details = await getDetails(anchor.href);
      prop.desc = anchor.textContent.replace(/for sale/, '').trim();
      prop.url = makeAbsoluteUrl(anchor.href);

      const infoArray = details['@graph'];
      // Hard-coded because I can't be bothered to search for infoArray['@type'] == 'Residence'
      const residence = infoArray[3];
      prop.loc = {lat: residence.geo.latitude, lng: residence.geo.longitude};
      prop.imgs = residence.photo.map(obj => obj.contentUrl);
    } else {
      // Fake it
      prop.desc = 'Expired?!';
      prop.url = '#';
      // We do have an image. Use it
      prop.imgs = [elem.children[1].children[0].src];
    }
    prop.addr = itemResult.children[2].textContent;

    const agentInfo = elem.querySelector('.listing-results-marketed');
    console.log(agentInfo);
    prop.agent = {
      name: agentInfo.children[2],
      phone: agentInfo.children[3].textContent.trim(),
      logo: agentInfo.children[4]
    };

    return prop;
  }

  const props = await Promise.all(propList.map(htmlElementToCommonFormat));
  const json = JSON.stringify(props);
  displayData(json, 'data-zoopla.json');
}

const functions = {
  'www.rightmove.co.uk': RightMove,
  'www.onthemarket.com': OnTheMarket,
  'www.zoopla.co.uk': Zoopla,
};

const fun = functions[window.location.host];

if (fun === undefined) {
  alert(
      `Don't know what to do on this website: ` +
      `${window.location.host}\nfunctions: ${functions}`);
} else {
  fun();
  console.log(`Got data at: ${new Date()}`);
}
})()
