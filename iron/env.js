/**
 * Copyright (c) 2016 Ganesh Prasad Sahoo (GnsP)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy 
 * of this software and associated documentation files (the "Software"), to deal 
 * in the Software without restriction, including without limitation the rights 
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
 * copies of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in 
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
 * SOFTWARE.
 *
 */


import Cell from './cell.js';
import ensure from './ensure.js';
import IronSymbol from './symbol.js';

import Rho from './rho.js';
import {Collection} from './collection.js';

import IError from './errors.js';

export default class Env {
  constructor (param, arg, par, newcollection=false) {
    this.__itype__ = "env";
    this.map = new Map();
    this.par = par; 
    this.syncLock = true;
    this.bind (param, arg);
    this.syncLock = false;
    this.rho = new Rho(this);
    this.symtab = new Map();

    if (newcollection) this.collection = new Collection();
    else if (this.par) this.collection = this.par.collection;
    else this.collection = null;
  }

	static isEnv (obj) {
		return typeof obj === 'object' && obj.__itype__ === 'env';
	}
  
  static clone (env) {
    let e = new Env(null, null, env.par);
    e.map = env.map;
    e.rho = env.rho;
    e.symtab = env.symtab;
    e.collection = env.collection;
    return e;
  }

  sync () {
    this.syncLock = true;
  }

  unsync () {
    this.syncLock = false;
  }

  syncAndBind (key, val) {
    let flag = false;
    if (!this.syncLock) {
      this.sync();
      flag = true;
    }
    this.bind (key, val);
    if (flag) this.unsync();
  }

  bind (key, val) {
    if (!this.syncLock) return false;
    while (key instanceof Cell) {
      if (val instanceof Cell) {
        this.bind (key.car, val.car);
        key = key.cdr;
        val = val.cdr;
      }
      else {
        this.bind (key.car, undefined);
        key = key.cdr;
      }
    }
    if (key !== null) {
      ensure (key instanceof IronSymbol, ""+Cell.stringify(key)+" is not an IronSymbol");
      let keystr = key.symbol;
      this.map.set (keystr, val);
    }
    return true;
  }

  __internal_find (key) {
    ensure (key instanceof IronSymbol, ""+key+" is not an IronSymbol");
    let keystr = key.symbol;
    if (this.map.has(keystr)) return this;
    return this.par.find(key);
  }

	find (key) {
		return this.__internal_find(key);
	}

  __internal_get (key) {
    ensure (key instanceof IronSymbol, ""+key+" is not an IronSymbol");
    let ret;
    let keystr = key.symbol;
    if (this.map.has(keystr)) ret = this.map.get(keystr);
    else if (this.par !== null) ret = this.par.get(key);
    else ret = key;
    
		return ret;
  }

	get (key) {
		return this.__internal_get(key);
	}

	getAsync (key, cb) {
		cb (null, this, null, this.__internal_get(key));
	}

  defc (key, val) {
    this.symtab.set(key, val);
    return val;
  }

  getc (key) {
    if (this.symtab.has(key)) return this.symtab.get(key);
    else if (this.par !== null) return this.par.getc(key);
    else return null;
  }

}
