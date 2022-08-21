import { isInSomeEnum } from '../utils/isInSomeEnum';
import { GameActions } from '../events/gameEmitter';

export const isInGameActions = isInSomeEnum(GameActions);
