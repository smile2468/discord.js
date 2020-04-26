'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class UserUpdateAction extends Action {
  handle(data) {
    const client = this.client;

    const newUser = client.users.cache.get(data.id);
    const oldUser = newUser._update(data);

    if (!oldUser.equals(newUser)) {
      /**
       * 유저의 정보 (예) 유저이름)가 수정되었을 때 실행됩니다.
       * @event Client#userUpdate
       * @param {User} oldUser 업데이트 이전의 유저
       * @param {User} newUser 업데이트 이후의 유저
       */
      client.emit(Events.USER_UPDATE, oldUser, newUser);
      return {
        old: oldUser,
        updated: newUser,
      };
    }

    return {
      old: null,
      updated: null,
    };
  }
}

module.exports = UserUpdateAction;
