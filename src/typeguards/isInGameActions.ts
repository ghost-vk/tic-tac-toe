import {isInSomeEnum} from "../utils/isInSomeEnum";
import {GameActions} from "../gameEmitter";

export const isInGameActions = isInSomeEnum(GameActions);
