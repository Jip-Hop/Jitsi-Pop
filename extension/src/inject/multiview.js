// Assign jitsipop also to this window object, so iframes can access it
const jitsipop = (window.jitsipop = window.opener.jitsipop);
const mainWindow = jitsipop.mainWindow;
var currentSelection = new Set();

const parentPoller = () => {
  if (!opener || opener.closed) {
    window.close();
  }
};

const reflow = () => {
  const iframes = Array.from(document.querySelectorAll("iframe")).sort(
    (a, b) => {
      return a.dataset.order - b.dataset.order;
    }
  );

  const result = fitToContainer(
    iframes.length,
    getViewportWidth(),
    getViewportHeight(),
    16,
    9
  );

  const rootStyle = document.querySelector(":root").style;
  rootStyle.setProperty("--gridWidth", result.ncols * result.itemWidth + "px");
  rootStyle.setProperty(
    "--gridHeight",
    result.nrows * result.itemHeight + "px"
  );
  rootStyle.setProperty("--videoWidth", result.itemWidth + "px");
  rootStyle.setProperty("--videoHeight", result.itemHeight + "px");

  let r = 0,
    c = 0;

  iframes.forEach((iframe) => {
    iframe.style.top = r * result.itemHeight + "px";
    iframe.style.left = c * result.itemWidth + "px";

    c++;

    if (c >= result.ncols) {
      c = 0;
      r++;
    }
  });
};

const getViewportWidth = () => {
  return Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
};

const getViewportHeight = () => {
  return Math.max(
    document.documentElement.clientHeight,
    window.innerHeight || 0
  );
};

// https://math.stackexchange.com/q/466198
// https://stackoverflow.com/q/2476327
const fitToContainer = (
  n,
  containerWidth,
  containerHeight,
  itemWidth,
  itemHeight
) => {
  // We're not necessarily dealing with squares but rectangles (itemWidth x itemHeight),
  // temporarily compensate the containerWidth to handle as rectangles
  containerWidth = (containerWidth * itemHeight) / itemWidth;
  // Compute number of rows and columns, and cell size
  var ratio = containerWidth / containerHeight;
  var ncols_float = Math.sqrt(n * ratio);
  var nrows_float = n / ncols_float;

  // Find best option filling the whole height
  var nrows1 = Math.ceil(nrows_float);
  var ncols1 = Math.ceil(n / nrows1);
  while (nrows1 * ratio < ncols1) {
    nrows1++;
    ncols1 = Math.ceil(n / nrows1);
  }
  var cell_size1 = containerHeight / nrows1;

  // Find best option filling the whole width
  var ncols2 = Math.ceil(ncols_float);
  var nrows2 = Math.ceil(n / ncols2);
  while (ncols2 < nrows2 * ratio) {
    ncols2++;
    nrows2 = Math.ceil(n / ncols2);
  }
  var cell_size2 = containerWidth / ncols2;

  // Find the best values
  var nrows, ncols, cell_size;
  if (cell_size1 < cell_size2) {
    nrows = nrows2;
    ncols = ncols2;
    cell_size = cell_size2;
  } else {
    nrows = nrows1;
    ncols = ncols1;
    cell_size = cell_size1;
  }

  // Undo compensation on width, to make squares into desired ratio
  itemWidth = (cell_size * itemWidth) / itemHeight;
  itemHeight = cell_size;
  return {
    nrows: nrows,
    ncols: ncols,
    itemWidth: itemWidth,
    itemHeight: itemHeight,
  };
};

const update = () => {
  const newSet = jitsipop.multiviewSelection;

  newSet.forEach((videoId) => {
    var targetFrame;
    if (!currentSelection.has(videoId)) {
      targetFrame = document.createElement("iframe");
      targetFrame.id = "video" + videoId;
      targetFrame.src = jitsipop.getVideoDocUrlForIframe(videoId);
      document.body.appendChild(targetFrame);
    } else {
      targetFrame = document.getElementById("video" + videoId);
    }
    targetFrame.dataset.order = jitsipop.getItemOrder(videoId);
  });

  currentSelection.forEach((videoId) => {
    if (!newSet.has(videoId)) {
      const targetFrame = document.getElementById("video" + videoId);
      if (targetFrame) {
        targetFrame.remove();
      }
    }
  });

  currentSelection = new Set(newSet);
  reflow();
};

const setup = () => {
  // Allow calling these objects from mainWindow
  window.update = update;

  window.onunload = () => {
    // Remove this window from the array of open pop-outs in the main window
    if (mainWindow && !mainWindow.closed) {
      // jitsipop.multiviewClosedHandler();
      jitsipop.multiviewWindow = null;
    }

    // TODO: needs a counter somewhere, because if it's open in multiview (not implemented yet),
    // and open in a pop-out window, it needs to still receive high res if only one of them is closed
    // jitsipop.receiveHighRes(participantId, false);
  };

  setInterval(parentPoller, 1000);

  if (mainWindow && !mainWindow.closed) {
    // jitsipop.windows.push(window);
    jitsipop.multiviewWindow = window;
  }

  window.addEventListener("resize", reflow);

  update();

  // tryRuntimeSendMessage({
  //   type: "multiviewWinLoad",
  // });

  document.documentElement.addEventListener("keyup", (event) => {
    // Number 13 is the "Enter" key on the keyboard,
    // or "Escape" key pressed in full screen
    if (
      event.keyCode === 13 ||
      (event.keyCode === 27 && window.innerHeight == window.screen.height)
    ) {
      // Cancel the default action, if needed
      event.preventDefault();
      tryRuntimeSendMessage({
        type: "toggleFullScreen",
      });
    }
  });
};

setup();