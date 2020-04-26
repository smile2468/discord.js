'use strict';

const Action = require('./Action');
const VoiceState = require('../../structures/VoiceState');
const { Events } = require('../../util/Constants');

class VoiceStateUpdate extends Action {
  handle(data) {
    const client = this.client;
    const guild = client.guilds.cache.get(data.guild_id);
    if (guild) {
      // Update the state
      const oldState = guild.voiceStates.cache.has(data.user_id)
        ? guild.voiceStates.cache.get(data.user_id)._clone()
        : new VoiceState(guild, { user_id: data.user_id });

      const newState = guild.voiceStates.add(data);

      // Get the member
      let member = guild.members.cache.get(data.user_id);
      if (member && data.member) {
        member._patch(data.member);
      } else if (data.member && data.member.user && data.member.joined_at) {
        member = guild.members.add(data.member);
      }

      // Emit event
      if (member && member.user.id === client.user.id) {
        client.emit('debug', `[VOICE] received voice state update: ${JSON.stringify(data)}`);
        client.voice.onVoiceStateUpdate(data);
      }

      /**
       * 유저가 음성 상태를 변경할 때 실행됩니다. - 예) 음성 채널에 접속/퇴장 하거나 마이크를 끄거나 킬때.
       * @event Client#voiceStateUpdate
       * @param {VoiceState} oldState 업데이트 이전의 음성 상태
       * @param {VoiceState} newState 업데이트 이후의 음성 상태
       */
      client.emit(Events.VOICE_STATE_UPDATE, oldState, newState);
    }
  }
}

module.exports = VoiceStateUpdate;
