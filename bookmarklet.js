// Bookmarklet should be an immediately invoked function
// TODO: Some properties might have been removed. Maybe add some warning messages for that.
(function() {

// Create a div with a label + textarea with our data
// The textarea element allows us to do a "select all" inside it easily
function displayData(data) {
  var div = document.createElement('div');
  let divStyle = div.style;
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

  var label = document.createElement('label');
  label.setAttribute('for', 'bookmarkletDataContents');
  let labelStyle = label.style;
  labelStyle.display = 'block';
  // Manually replace '%' with '%25' so the bookmarklet works
  labelStyle.fontSize = '125%25';
  label.textContent = 'Data gathered and cleaned up. Contents:';
  div.appendChild(label);

  var textarea = document.createElement('textarea');
  textarea.setAttribute('id', 'bookmarkletDataContents');
  let textareaStyle = textarea.style;
  // Manually replace '%' with '%25' so the bookmarklet works
  textareaStyle.width = '100%25';
  textareaStyle.height = '100%25';
  textareaStyle.boxSizing = 'border-box';
  textarea.textContent = data;
  div.appendChild(textarea);

  document.body.appendChild(div);
}

// merge two properties with the same ID
function mergeToCommonFormat(pShortlist, pData) {
  if (pData === undefined) {
    console.log('pData is undefined. Property with id ' +
                pShortlist.propertyId +
                ' was probably removed. shortlist entry:');
    console.log(pShortlist);
    return undefined;
  }

  const rmLocToLatLng = loc => ({lat : loc.latitude, lng : loc.longitude});
  return {
    id : pShortlist.propertyId,

    // From shortlist data
    saved : pShortlist.dateSavedOn,
    imgs : pShortlist.images,
    status : pShortlist.status,

    // From map data (after fetching additional info)
    url : pData.propertyUrl,
    addr : pData.displayAddress,
    desc : pData.propertyTypeFullDescription,
    summary : pData.summary,
    addedOrReduced : pData.addedOrReduced,
    area : pData.displaySize,

    beds : pData.bedrooms,
    floorplans : pData.numberOfFloorplans,
    subType : pData.propertySubType,

    loc : rmLocToLatLng(pData.location),
    updated : {
      reason : pData.listingUpdate.listingUpdateReason,
      data : pData.listingUpdate.listingUpdateDate,
    },
    firstVisible : pData.firstVisibleDate,

    price : {
      amount : pData.price.amount,
      display : pData.price.displayPrices[0].displayPrice,
      qual : pData.price.displayPrices[0].displayPriceQualifier,
    },

    // Do we want the one to four images from the map data?
    // Maybe the mainMapImage?

    // Mixed data
    agent : {
      logo : pShortlist.agent.branchLogoUrl,

      phone : pData.customer.contactTelephone,
      // this is weird in the shortlist
      url : pData.customer.branchLandingPageUrl,
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
    fetch(shortlistUrl(id), {credentials : 'include'}).then(x => x.json());
const mapProperties = shortlistFetch(1).then(page1 => {
  var n_pages = page1.totalPages;
  var shortlist = page1.properties;
  console.log('got shortlist page 1');

  // Don't re-fetch the first page, pages start counting on 1
  var pages = [];
  for (var i = 2; i <= n_pages; ++i)
    pages.push(shortlistFetch(i).then(x => x.properties));

  return Promise.all(pages).then(rest => {
    console.log('got all shortlist pages');
    rest = rest.flat();
    var allProps = shortlist.concat(rest);

    return allProps;
  });
});

function mergeLists(props, data) {
  return props.map(p => mergeToCommonFormat(p, data.get(p.propertyId)));
}

mapProperties
    .then(props => {
      const idsToQuery = props.map(p => p.propertyId);
      var requests = [];
      // 25 per search seems to be the maximum
      const STEP = 25;
      for (var cursor = 0; cursor < idsToQuery.length; cursor += STEP) {
        var batch = idsToQuery.slice(cursor, cursor + STEP);
        requests.push(
            fetch('/api/_searchByIds?channel=BUY&viewType=MAP&propertyIds=' +
                  batch)
                .then(x => x.json()));
      }
      return Promise.all(requests).then(replies => [props, replies.flat()]);
    }).then(things => {
      console.log('got query results');
      const [shortlist, mapData] = things;

      var idMapData = new Map();
      for (const item of mapData)
        idMapData.set(item.id, item);

      console.log('merging...');
      // Merge to a single list, then show it.
      return mergeLists(shortlist, idMapData).filter(Boolean);
    })
    .then(JSON.stringify)
    .then(displayData);
})()
