'use strict';

require('setimmediate');
const EventEmitter = require('events');
const RESTManager = require('../rest/RESTManager');
const { DefaultOptions } = require('../util/Constants');
const Util = require('../util/Util');

/**
 * 모든 클라이언트를 위반 기본 클래스
 * @extends {EventEmitter}
 */
class BaseClient extends EventEmitter {
  constructor(options = {}) {
    super();

    /**
     * {@link BaseClient#setTimeout} 에서 설정된 시간 제한은 계속 유지됩니다}
     * @type {Set<Timeout>}
     * @private
     */
    this._timeouts = new Set();

    /**
     * {@link BaseClient#setInterval} 에서 설정된 간격은 계속 유지됩니다
     * @type {Set<Timeout>}
     * @private
     */
    this._intervals = new Set();

    /**
     * {@link BaseClient#setImmediate} 에서 설정된 간격은 계속 유지됩니다
     * @type {Set<Immediate>}
     * @private
     */
    this._immediates = new Set();

    /**
     * 클라이언트가 인스턴스화된 옵션
     * @type {ClientOptions}
     */
    this.options = Util.mergeDefault(DefaultOptions, options);

    /**
     * 클라이언트의 REST 매니저
     * @type {RESTManager}
     * @private
     */
    this.rest = new RESTManager(this, options._tokenType);
  }

  /**
   * API 단축어
   * @type {Object}
   * @readonly
   * @private
   */
  get api() {
    return this.rest.api;
  }

  /**
   * 기본 클라이언트가 사용하는 모든 에셋들을 삭제합니다.
   */
  destroy() {
    for (const t of this._timeouts) this.clearTimeout(t);
    for (const i of this._intervals) this.clearInterval(i);
    for (const i of this._immediates) this.clearImmediate(i);
    this._timeouts.clear();
    this._intervals.clear();
    this._immediates.clear();
  }

  /**
   * 클라이언트가 종료되면 자동으로 취소되는 setTimeout을 설정하세요
   * @param {Function} fn 실행할 함수
   * @param {number} delay 실행하기 전 기다릴 시간 (밀리초)
   * @param {...*} args 함수의 인수
   * @returns {Timeout}
   */
  setTimeout(fn, delay, ...args) {
    const timeout = setTimeout(() => {
      fn(...args);
      this._timeouts.delete(timeout);
    }, delay);
    this._timeouts.add(timeout);
    return timeout;
  }

  /**
   * 타임아웃을 지웁니다.
   * @param {Timeout} timeout 취소할 타임아웃
   */
  clearTimeout(timeout) {
    clearTimeout(timeout);
    this._timeouts.delete(timeout);
  }

  /**
   * Sets an interval that will be automatically cancelled if the client is destroyed.
   * @param {Function} fn Function to execute
   * @param {number} delay Time to wait between executions (in milliseconds)
   * @param {...*} args Arguments for the function
   * @returns {Timeout}
   */
  setInterval(fn, delay, ...args) {
    const interval = setInterval(fn, delay, ...args);
    this._intervals.add(interval);
    return interval;
  }

  /**
   * Clears an interval.
   * @param {Timeout} interval Interval to cancel
   */
  clearInterval(interval) {
    clearInterval(interval);
    this._intervals.delete(interval);
  }

  /**
   * Sets an immediate that will be automatically cancelled if the client is destroyed.
   * @param {Function} fn Function to execute
   * @param {...*} args Arguments for the function
   * @returns {Immediate}
   */
  setImmediate(fn, ...args) {
    const immediate = setImmediate(fn, ...args);
    this._immediates.add(immediate);
    return immediate;
  }

  /**
   * Clears an immediate.
   * @param {Immediate} immediate Immediate to cancel
   */
  clearImmediate(immediate) {
    clearImmediate(immediate);
    this._immediates.delete(immediate);
  }

  toJSON(...props) {
    return Util.flatten(this, { domain: false }, ...props);
  }
}

module.exports = BaseClient;
