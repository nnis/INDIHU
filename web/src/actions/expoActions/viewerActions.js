import fetch from "../../utils/fetch";
import { get, forEach, isEmpty, isArray, compact, set } from "lodash";
import { possibleFiles, fileObjects } from "../../enums/fileType";
import {
  EXPO_VIEWER,
  EXPO_VIEWER_FILE_LOADED,
  EXPO_VIEWER_FILES_TOTAL
} from "./../constants";
import { getFileById } from "../fileActions";
import { showLoader } from "../appActions";
import { screenUrl } from "../../enums/screenType";

export const toggleInteractive = viewInteractive => ({
  type: EXPO_VIEWER,
  payload: { viewInteractive }
});

export const setViewInteractiveData = viewInteractiveData => ({
  type: EXPO_VIEWER,
  payload: { viewInteractiveData }
});

export const loadExposition = url => async dispatch => {
  try {
    const response = await fetch(`/api/exposition/u/${url}`);
    const body = await response.text();

    if (body) {
      const viewExpo = await JSON.parse(body);

      dispatch({
        type: EXPO_VIEWER,
        payload: {
          viewExpo: { ...viewExpo, structure: JSON.parse(viewExpo.structure) }
        }
      });

      return viewExpo;
    }

    return response.status === 200;
  } catch (error) {
    return false;
  }
};

export const loadScreen = (section, screen) => async (dispatch, getState) => {
  const expo = getState().expo.viewExpo;
  if (!expo || !expo.structure || (screen && !expo.structure.screens))
    return false;

  const viewScreen =
    screen !== undefined
      ? expo.structure.screens[section]
        ? expo.structure.screens[section][screen]
        : null
      : section === screenUrl.FINISH
        ? { ...expo.structure[screenUrl.START], ...expo.structure[section] }
        : expo.structure[section];

  if (viewScreen) {
    await dispatch({
      type: EXPO_VIEWER,
      payload: { viewScreen }
    });

    return viewScreen;
  }

  await dispatch({
    type: EXPO_VIEWER,
    payload: { viewScreen: null }
  });

  return false;
};

export const setChapterMusic = viewChapterMusic => ({
  type: EXPO_VIEWER,
  payload: { viewChapterMusic }
});

export const setLastChapter = viewLastChapter => ({
  type: EXPO_VIEWER,
  payload: { viewLastChapter }
});

export const setViewExpo = viewExpo => ({
  type: EXPO_VIEWER,
  payload: { viewExpo }
});

export const setViewScreen = viewScreen => ({
  type: EXPO_VIEWER,
  payload: { viewScreen }
});

export const expoViewerFileLoaded = () => ({
  type: EXPO_VIEWER_FILE_LOADED,
  payload: {}
});

export const expoViewerFilesTotalUpdate = () => ({
  type: EXPO_VIEWER_FILES_TOTAL,
  payload: {}
});

/**
 * Create object with file instance
 */
const returnMeObject = (data, fileType, attribute, dispatch) => {
  if (data) {
    const obj = {};
    if (fileObjects[fileType] === fileObjects.audio) {
      const audio = new Audio();
      audio.src = `/api/files/${data.fileId}`;

      if (dispatch) {
        audio.onloadeddata = () => {
          dispatch(expoViewerFileLoaded());
        };
        dispatch(expoViewerFilesTotalUpdate());
      }

      obj[attribute] = audio;
    } else if (fileObjects[fileType] === fileObjects.image) {
      const image = new Image();
      image.src = `/api/files/${data.fileId}`;
      image.alt = "";

      if (dispatch) {
        image.onload = () => {
          dispatch(expoViewerFileLoaded());
        };
        dispatch(expoViewerFilesTotalUpdate());
      }

      obj[attribute] = image;
    } else if (fileObjects[fileType] === fileObjects.video) {
      const video = document.createElement("video");

      const source = document.createElement("source");
      source.src = `/api/files/${data.fileId}`;
      source.type = data.type;

      video.appendChild(source);

      if (dispatch) {
        const checkLoad = () => {
          if (video.readyState === 4) {
            dispatch(expoViewerFileLoaded());
          } else {
            setTimeout(checkLoad, 100);
          }
        };

        setTimeout(checkLoad, 100);
        dispatch(expoViewerFilesTotalUpdate());
      }

      obj[attribute] = video;
    }
    return !isEmpty(obj) ? obj : null;
  }
  return null;
};

/**
 * Create structure of file instances to be preloaded
 */
export const filePreloader = () => async (dispatch, getState) => {
  dispatch(showLoader(true));
  const expo = getState().expo.viewExpo;
  const structure = get(expo, "structure");
  const struct = get(structure, "screens");

  if (struct) {
    const preloadedFiles = {};

    set(preloadedFiles, screenUrl.START, {});
    set(preloadedFiles, screenUrl.FINISH, {});

    if (get(structure, screenUrl.START)) {
      if (get(structure, `${screenUrl.START}.image`)) {
        set(preloadedFiles, screenUrl.START, {
          ...preloadedFiles[screenUrl.START],
          ...returnMeObject(
            dispatch(getFileById(get(structure, `${screenUrl.START}.image`))),
            "image",
            "image",
            dispatch
          )
        });

        set(preloadedFiles, screenUrl.FINISH, {
          ...preloadedFiles[screenUrl.FINISH],
          ...returnMeObject(
            dispatch(getFileById(get(structure, `${screenUrl.START}.image`))),
            "image",
            "image",
            dispatch
          )
        });
      }
    }

    forEach(struct, (chapter, rowN) => {
      set(preloadedFiles, rowN, []);
      forEach(chapter, (screen, colN) => {
        preloadedFiles[rowN].push({});
        forEach(possibleFiles, fileType => {
          const adept = get(screen, fileType);
          if (isArray(adept)) {
            forEach(compact(adept), (a, i) => {
              const file = a.id ? a.id : a;
              preloadedFiles[rowN][colN] = {
                ...preloadedFiles[rowN][colN],
                ...returnMeObject(
                  dispatch(getFileById(file)),
                  fileType,
                  `${fileType}[${i}]`,
                  dispatch
                )
              };
            });
          } else if (adept) {
            preloadedFiles[rowN][colN] = {
              ...preloadedFiles[rowN][colN],
              ...returnMeObject(
                dispatch(getFileById(adept)),
                fileType,
                fileType,
                dispatch
              )
            };
          }
        });
      });
    });

    dispatch({
      type: EXPO_VIEWER,
      payload: {
        preloadedFiles
      }
    });
  }
  dispatch(showLoader(false));
};

/**
 * Create object of file instances of one choosen screen
 */
export const screenFilePreloader = (activeScreen, section, screen) => async (
  dispatch,
  getState
) => {
  dispatch(showLoader(true));
  const expo = getState().expo.activeExpo;
  const structure = get(expo, "structure");

  let preloadedFiles =
    screen > 0
      ? {
          ...returnMeObject(
            dispatch(getFileById(structure.screens[section][0].music)),
            "music",
            "music"
          )
        }
      : {};

  forEach(possibleFiles, fileType => {
    const adept = get(activeScreen, fileType);
    if (isArray(adept)) {
      forEach(compact(adept), (a, i) => {
        const file = a.id ? a.id : a;
        preloadedFiles = {
          ...preloadedFiles,
          ...returnMeObject(
            dispatch(getFileById(file)),
            fileType,
            `${fileType}[${i}]`
          )
        };
      });
    } else if (adept) {
      preloadedFiles = {
        ...preloadedFiles,
        ...returnMeObject(dispatch(getFileById(adept)), fileType, fileType)
      };
    }
  });

  dispatch({
    type: EXPO_VIEWER,
    payload: {
      preloadedFiles
    }
  });
  dispatch(showLoader(false));

  return preloadedFiles;
};
