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
import Env from './env.js';
import Stream from './stream.js';
import {fn} from './higher.js';
import IronSymbol from './symbol.js';
import IError from './errors.js';
import {nextTick, mapLimit, whilst} from 'async-es';
//import {inspect} from 'util';


const _quote = new IronSymbol ('_quote');
const _if = new IronSymbol ('_if');
const _def = new IronSymbol ('_def');
const _assign_unsafe = new IronSymbol ('_assign!');
const _fn = new IronSymbol('_fn');
const _begin = new IronSymbol('_begin');
const _sync = new IronSymbol('_sync');
const _rho = new IronSymbol('_rho');

const _self = new IronSymbol('_self'); 
const _null_ = new IronSymbol('_null_'); 
const _object_ = new IronSymbol('_{}_'); 
const _array_ = new IronSymbol('_[]_'); 
const _map_ = new IronSymbol('_map_'); 
const _get = new IronSymbol('_get'); 
const _set = new IronSymbol('_set'); 
const _push = new IronSymbol('_push'); 
const _pull = new IronSymbol('_pull'); 
const _stream = new IronSymbol('_stream'); 
const _do = new IronSymbol('_do'); 
const _on = new IronSymbol('_on'); 
const _include = new IronSymbol('_include'); 
const _import = new IronSymbol('_import'); 

const defaultCallback = (err, env) => {
  if (err) {
    if (err instanceof IError) err.log();
    throw err;
  }
  //console.log (env);
};

export default function evalAsync (x, env, cb=defaultCallback ) {
  if (x instanceof IronSymbol) {
    if (_self.equal(x)) nextTick (cb, null, env, null, env);
    else if (_null_.equal(x)) nextTick (cb, null, env, null, null);
    else if (_object_.equal(x)) nextTick (cb, null, env, null, {});
    else if (_array_.equal(x)) nextTick (cb, null, env, null, []);
    else if (_map_.equal(x)) nextTick (cb, null, env, null, new Map());
    else nextTick (cb, null, env, null, env.get(x));
  }
  else if (!(x instanceof Cell)) nextTick (cb, null, env, null, x);
  else if (_quote.equal(x.car)) nextTick (cb, null, env, null, x.cdr.car);
  else if (_if.equal(x.car)) {
    let test = x.cdr.car;
    let then = x.cdr.cdr.car;
    let othr = x.cdr.cdr.cdr.car;
    //console.log ('\n\n\n\ndebug: \n*********', inspect(test), inspect(then), inspect(othr), '\n\n');
    nextTick (evalAsync, test, env, (err, env, _, res) => {
      let expr = res ? then : othr;
      nextTick (evalAsync, expr, env, cb);
    });
  }
  else if (_def.equal(x.car)) {
    let name = x.cdr.car;
    let val = x.cdr.cdr.car;
    nextTick (evalAsync, val, env, (err, _env, _, value) => {
      let sts = env.bind(name, value);
      if (!sts) nextTick (cb, 'can _def only inside a _begin block');
      else nextTick (cb, null, env, null, value);
    });
  }
  else if (_assign_unsafe.equal(x.car)) {
    let name = x.cdr.car;
    let val = x.cdr.cdr.car;
    nextTick (evalAsync, val, env, (err, _env, _, value) => {
      let sts = env.find(name).bind(name, value);
      if (!sts) nextTick (cb, 'can _def only inside a _begin block');
      else nextTick (cb, null, env, null, value);
    });
  }
  else if (_get.equal(x.car)) {
    let obj = x.cdr.car;
    let key = x.cdr.cdr.car;

    nextTick (evalAsync, obj, env, (_err, _env, _cb, _obj) => {
      nextTick (evalAsync, key, env, (_err, _env, _cb, _key) => {
        let obj = _obj;
        let key = _key;
        let err = _err;
        
        //console.log (inspect (key));

        if (obj instanceof Object && obj.__itype__ === "env") {
          if (key instanceof Object && key.type === "ironsymbol") {
            //console.log ('_____DEBUG_______\n'+ inspect(obj));
            nextTick (cb, err, env, null, obj.map.get(key.symbol));
          }
          else nextTick (cb, err, env, null, key);
        }
        else if (obj instanceof Map) {
          nextTick (cb, err, env, null, obj.get(key));
        }
        else if (obj instanceof Array) {
          nextTick (cb, err, env, null, obj [key]);
        }
        else if (obj instanceof Object) {
          if (key instanceof Object && key.type === "ironsymbol") 
            nextTick (cb, err, env, null, obj [key.symbol]);
          else nextTick (cb, err, env, null, obj [key]);
        }
        else nextTick (cb, new IError ('Can not _get from '+obj));
      });
    });
  }
  else if (_set.equal(x.car)) {
    let obj = x.cdr.car;
    let key = x.cdr.cdr.car;
    let val = x.cdr.cdr.cdr.car;
    
    nextTick (evalAsync, obj, env, (_err, _env, _cb, _obj) => {
      nextTick (evalAsync, key, env, (_err, _env, _cb, _key) => {
        nextTick (evalAsync, key, env, (_err, _env, _cb, _val) => {
          let obj = _obj;
          let key = _key;
          let val = _val;
          let err = _err;
          
          if (obj instanceof Object && obj.__itype__ === "env") {
            nextTick (cb, new IError ('can not set to a scope outside the scope'));
          }
          else if (obj instanceof Map) {
            nextTick (cb, null, env, null, obj.set(key, val));
          }
          else if (obj instanceof Array) {
            if (isNaN(Number(key))) nextTick (cb, new IError ('Arrays can have integers as keys'));
            else {
              let key = Number(key);
              if (key%1 === 0) {
                if (key < 0) key = obj.length + key;
                if (key < 0) nextTick (cb, new IError ('can not _set '+obj+' ['+ (key - obj.length) +']'));
                obj [key] = val;
                nextTick (cb, null, env, null, obj);
              }
              else nextTick (cb, new IError ('Arrays can have integers as keys'));
            }
          }
          else if (obj instanceof Object) {
            if (key instanceof Object && key.type === "ironsymbol") key = key.symbol;
            obj [key] = val;
            nextTick (cb, null, env, null, obj);
          }
          else nextTick (cb, new IError ('Can not _set on '+obj));
        });
      });
    });
  }
  else if (_push.equal(x.car)) {
    let arr = x.cdr.car;
    let val = x.cdr.cdr.car;

    nextTick (evalAsync, arr, env, (_err, _env, _cb, _arr) => {
      nextTick (evalAsync, val, env, (_err, _env, _cb, _val) => {
        let arr = _arr;
        let val = _val;

        if (arr instanceof Array) {
          arr.push(val);
          nextTick (cb, null, env, null, arr);
        }
        else nextTick (cb, new IError ('Can _push only on Arrays'));
      });
    });
  }
  else if (_fn.equal(x.car)) {
    let params = x.cdr.car;
    let body = x.cdr.cdr.car;
    nextTick (cb, null, env, null, fn (params, body, env) );
  }
  else if (_rho.equal(x.car)) {
    let pattern = x.cdr.car;
    let resolution = x.cdr.cdr.car;
    nextTick (evalAsync, pattern, env, (err, _env, _, val) => {
      //console.log('debug-pattern: ', inspect(val));
      let sts = env.rho.accept(val, resolution);
      //console.log ('\n\n\n\ndebug: ', inspect(env), '\n\n');
      if (sts instanceof IError) nextTick (cb, sts);
      else nextTick (cb, null, env, null, env);
    });
  }
  else if (_begin.equal(x.car) || _sync.equal(x.car)) {
    let root = x.cdr;
    let cur = root;
    
    let _env = env;
    if (_begin.equal(x.car)) _env = new Env(null, null, env);

    let unsyncFlag = false;
    if (!_env.syncLock) {
      unsyncFlag = true;
      _env.sync();
    }
    whilst (
      () => { return x.cdr instanceof Cell; },
      (callback) => {
        x = x.cdr;
        nextTick (evalAsync, x.car, _env, (err, __env, _, argval) => {
          nextTick (callback, err, argval);
        });
      },

      (err, res) => {
        if (unsyncFlag) _env.unsync();
        nextTick (cb, err, _env, null, res);
      }
    );
  }
  else if (_stream.equal(x.car)) {
    let func = x.cdr.car;
    let args = x.cdr.cdr;

    //let argvals = [];
    let arglist = [];
    //let argflags = [];
    //let argcount = 0;
    while (args instanceof Cell) {
      //argvals.push (null);
      //argflags.push(false);
      arglist.push (args.car);
      args = args.cdr;
    }
    //argcount = argflags.length;

    nextTick (evalAsync, func, env, (err, _env, _, func) => {
      
      let corefn = (updatefn) => {
        let argvals = Array(arglist.length);
        let argflags = [];
        let argcount = arglist.length;
        for (let i=0; i<arglist.length; i++) {
          argflags.push(false);
          nextTick (evalAsync, arglist[i], env, (err, _env, _, argval) => {
            argvals[i] = argval;
            if (argval !== null && argval !== undefined) {
              //debugger;
              if (!argflags[i]) {
                argflags[i] = true;
                argcount--;
              }
            }
            else {
              if (argflags[i]) {
                argflags[i] = false;
                argcount++;
              }
            }
            if (argcount === 0) nextTick (func, err, env, (err, _env, _cb, retval) => {
                nextTick (updatefn, retval);
              } , ...argvals);
          });
        }
      };
      
      nextTick(cb, err, env, null, new Stream(corefn, env) );

    });
  }
  else if (_on.equal(x.car)) {
    let controlStream = x.cdr.car;
    let expr = x.cdr.cdr.car;
    
    nextTick (evalAsync, controlStream, env, (err, _env, _, cs) => {
      let corefn = (updatefn) => {
        cs.addcb((err, _env, _cb, val) => {
          nextTick (evalAsync, expr, env, (err, _env, _, val) => {
            if (val !== null && val !== undefined)
              nextTick (updatefn, val);
          });
        });
      };
      let stream = new Stream (corefn, env);
      nextTick (cb, err, env, null, stream);
    });
  }
  else if (_pull.equal(x.car)) {
    let stream = x.cdr.car;
    nextTick (evalAsync, stream, env, (err, _env, _, s) => {
      if (s instanceof Object && s.__itype__==='stream')
        nextTick (cb, null, env, null, s.value);
      else if (s instanceof Array)
        nextTick (cb, null, env, null, s.shift());
      else nextTick (cb, new IError("can pull from streams and arrays only"));
    });
  }
  else if (_do.equal(x.car)) {
    let stream = x.cdr.car;
    nextTick (evalAsync, stream, env, (err, _env, _, streamObj) => {
      streamObj.addcb ((err) => { if(err) throw err;} );
    });
    nextTick (cb, null, env, null, null);
  }
  else if (_include.equal(x.car)) {
    let includefn = env.get(x.car);
    nextTick (evalAsync, x.cdr.car, env, (err, _env, _, sourcename) => {
      nextTick (includefn, err, env, cb, sourcename);
    });
  }
  else if (_import.equal(x.car)) {
    //console.log('\n\n\n',env,'\n\n\n');
    let importfn = env.get(x.car);
    nextTick (evalAsync, x.cdr.car, env, (err, _env, _, sourcename) => {
      let names = null;
      if (x.cdr.cdr) names = x.cdr.cdr.car;
      nextTick (evalAsync, names, env, (err, _env, _, namesList) => {
        nextTick (importfn, err, env, cb, sourcename, namesList);
      });
    });
  }
  else {
    nextTick (evalAsync, x.car, env, (err, env, _, func) => {
      //console.log (''+x.car +'\n\n'+inspect(func));
      if (func instanceof Object && func.__itype__ === "env") {
        //console.log ('__debug__\n\n ' + inspect(func));
        let acell = x.cdr;
        let _env = new Env (null, null, env);

        let reduced = func.rho.reduce (acell, _env);
        //console.log ('\n\n\n\ndebug: ', inspect(env), '\n\n');
        if (reduced === null) nextTick (cb, null, _env, null, null);
        else {
          //console.log (reduced);

          let args = reduced.args;
          let params = reduced.params;
          let body = reduced.body;
          
          mapLimit (args, 32, (arg, _cb) => {
            //console.log ('debug : ', arg);
            nextTick(evalAsync, arg, _env, (err, __env, _, argval) => {
              nextTick (_cb, err, argval);
            });
          },

          (err, argvals) => {
            let scope = new Env (Cell.list(params), Cell.list(argvals), _env);
            //console.log (scope);
            nextTick (evalAsync, body, scope, (err, _, __, val) => {
              nextTick (cb, err, _env, null, val);
            });
          });

          //nextTick (evalAsync, reduced.body, reduced.env, (err, _, __, val) => {
            //nextTick (cb, err, env, null, val);
          //});
        }
      }
      
      else if (func instanceof Object && func.__itype__ === 'stream') {
        func.addcb(cb)
        nextTick (cb, err, env, null, func.value);
      }

      else if (func instanceof Function) {
        let args = [];
        while (x.cdr instanceof Cell) {
          x = x.cdr;
          args.push (x.car);
        }
        
        let evalArg = (arg, _cb) => {
          nextTick(evalAsync, arg, env, (err, env, _, argval) => {
            nextTick (_cb, err, argval);
          });
        };
        
        mapLimit (args, 32, evalArg, (err, argvals) => {
          //console.log ('\n\n\n\ndebug: ', argvals, '\n', env, '\n\n');
          let _env = new Env (null, null, env);
          nextTick (func, err, _env, cb, ...argvals);
        });

      }
      else nextTick (cb, new IError ('can not evaluate list '+x));
    });
  }

}

