let loop = false;
let startTime = new Date().getTime();
let frameTime = 1 / 200;
const attemps = 100;
const states = {
  Ready: 'ready', // Initial State
  Jump: 'jump', // Partial Sequence
  JumpWarned: 'jumpwarned', // Multi-Jump Warning Sent
  Crouch: 'crouch', // Incorrect Sequence, let it play out for a bit
};
const device = {
  Keyboard: 'keyboard', // for keypress events
  Mouse: 'mouse', // for mouse button press events
  Wheel: 'mousewheel', // for scroll wheel events
};
class Input {
  constructor(device, value) {
    this.device = device;
    this.value = value;
  }
}
let selected_inputs = {
  jump: null,
  crouch: null,
};

let state = states.Ready;
let lastState = states.Jump;
setupListeners('jumpRecord');
setupListeners('crouchRecord');

function setupListeners(id) {
  const record_el = document.getElementById(id);
  record_el.onclick = function recordInput(e) {
    const el = record_el.parentElement.querySelector(
      '*[name="selection-area"]'
    );
    console.log(el);
    // el.addEventListener('contextmenu', (e) => {
    //   e.preventDefault();
    // });
    el.focus();
    el.addEventListener('keyup', keyListener);
    el.addEventListener('mouseup', mouseListener);
    el.addEventListener('wheel', wheelListener);
  };
}
function removeListeners(el) {
  el.removeEventListener('keyup', keyListener);
  el.removeEventListener('mouseup', mouseListener);
  el.removeEventListener('wheel', wheelListener);
}
function keyListener(e) {
  console.log(e);
  selected_inputs[e.target.id.toLowerCase()] = new Input(
    device.Keyboard,
    e.key
  );
  e.target.textContent = e.key;
  removeListeners(e.target);
}
function mouseListener(e) {
  console.log(e);

  switch (e.button) {
    case 0:
      e.target.textContent = 'Left Click';
      break;
    case 1:
      e.target.textContent = 'Middle Click';
      break;
    case 2:
      e.target.textContent = 'Right Click';
      break;
    case 3:
      e.target.textContent = 'Mouse 3';
      sleep(10000);
      break;
    case 4:
      e.target.textContent = 'Mouse 4';
      sleep(10000);
      break;
    default:
      e.target.textContent = `Unknown mouse button code: ${e.button}`;
  }
  selected_inputs[e.target.id.toLowerCase()] = new Input(
    device.Mouse,
    e.button
  );
  removeListeners(e.target);
}
function wheelListener(e) {
  console.log(e);
  if (e.deltaY > 0) {
    e.target.textContent = 'Wheel Down';
    selected_inputs[e.target.id.toLowerCase()] = new Input(
      device.Wheel,
      Math.sign(e.deltaY)
    );
  }
  if (e.deltaY < 0) {
    e.target.textContent = 'Wheel Up';
    selected_inputs[e.target.id.toLowerCase()] = new Input(
      device.Wheel,
      Math.sign(e.deltaY)
    );
  }
  removeListeners(e.target);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const startBtn = document.getElementById('start-session');
startBtn.onclick = startSession;

async function startSession(e) {
  startBtn.blur(); // pressing space right after clicking on button fires the click event again because button is focused.
  let attempt = 0;
  let cumlative = 0;
  let chance = 0;
  let i = 0;
  const fps = document.getElementById('fps').value;
  frameTime = 1 / fps;
  console.log('Session Started');
  while (i < attemps * 2) {
    if (lastState !== state) {
      if (state === states.Jump) {
        console.info('%cAwaiting Crouch...', 'color:darkgray');
      }
      if (state === states.Ready) {
        cumlative = cumlative + chance;
        // console.group();
        if (attempt !== 0) {
          // console.log(
          //   '-------------------------------------------------------------------------------------'
          // );
          // Small delay so previous attempt doesn't effect this attempt.
          sleep(125);
          const avarage = cumlative / attempt;
          console.group(
            `###### Attempt ${attempt} - Average: ${avarage}% ######`
          );
          console.info('%cAwaiting Jump...', 'color:darkgray');
        } else {
          console.group('###### Attempt 0 - Average: NA ######');
          console.info('%cAwaiting Jump...', 'color:darkgray');
        }
        attempt = attempt + 1;
      }
    }

    lastState = state;
    let key = await waitingKeypress();

    if (key === selected_inputs.crouch.value) {
      if (state === states.Ready) {
        // Crouched First
        console.info('%c Key Pressed (Crouch)', 'color:orange');
        startTime = new Date().getTime();
        state = states.Crouch;
      } else if (state === states.Jump || state === states.JumpWarned) {
        // Happy Path
        console.info('%c Key Pressed (Crouch)', 'color:green');
        let now = new Date().getTime();
        const calculated = (now - startTime) / 1000;
        const elapsedFrames = calculated / frameTime;
        const differenceSeconds = frameTime - calculated;
        let message;
        if (elapsedFrames < 1) {
          chance = elapsedFrames * 100;
          message = `Crouch slightly *later* by ${differenceSeconds} seconds to improve.`;
        } else if (elapsedFrames < 2) {
          chance = (2 - elapsedFrames) * 100;
          message = `Crouch slightly *sooner* by ${
            differenceSeconds * -1
          } seconds to improve.`;
        } else {
          chance = 0;
          message = `Crouch too late by ${differenceSeconds} seconds to improve.`;
        }

        console.log(`${elapsedFrames} frames have passed.`);

        if (chance > 0) {
          console.info(`%c${chance}% chance to hit.`, 'color:green');
        } else {
          console.info(`%c0% chance to hit.`, 'color:red');
        }

        console.info(`%c${message}`, 'color:orange');
        console.groupEnd();
        state = states.Ready;
      } else if (state === states.Crouch) {
        // Double Crouch
        console.info('%c Key Pressed (Crouch)', 'color:orange');
        console.info('%c ouble Crouch Input, Resetting', 'color:red');
        attempt = attempt - 1;
        chance = 0;
        state = states.Ready;
      }
    } else if (key === selected_inputs.jump.value) {
      if (state === states.Ready) {
        // Happy Path
        console.info('%c Key Pressed (Jump)', 'color:green');
        startTime = new Date().getTime();
        state = states.Jump;
      } else if (state === states.Jump) {
        // Multi Jump Input.
        console.info('%c Key Pressed (Jump) - Ignored', 'color:darkgray');
        state = states.JumpWarned;
        console.info(
          '%cWarning: Multiple jumps detected, results may not reflect ingame behavior.',
          'color:orange'
        );
      } else if (state === states.JumpWarned) {
        // Multi Jump input, already warned.
        console.info('%c Key Pressed (Jump) - Ignored', 'color:darkgray');
        state = states.JumpWarned;
      } else if (state === states.Crouch) {
        console.info('%c Key Pressed (Jump) - Ignored', 'color:orange');
        console.info('%c0% chance to hit', 'color:red');
        console.info('%c- You must jump before you crouch', 'color:red');
        // Difference in time between inputs + 1 frameTime for the offset.
        let now = new Date().getTime();
        const delta = (now - startTime) / 1000 + frameTime;
        const earlyby = delta / frameTime;

        chance = 0;

        console.info(`Press crouch later by ${earlyby} frames (${delta}s)`);
        console.groupEnd();

        state = states.Ready;
      }
    } else {
      console.log('%c Key Pressed (and Ignored)', 'color:darkgray');
    }
    i += 1;
  }
}
function get_device_props(device_type, e = null) {
  switch (device_type) {
    case device.Keyboard:
      return ['keydown', e?.key];
    case device.Mouse:
      return ['mouseup', e?.button];
    case device.Wheel:
      return ['wheel', Math.sign(e?.deltaY)];
  }
}
function waitingKeypress() {
  const devices = new Set([
    selected_inputs.jump.device,
    selected_inputs.crouch.device,
  ]);
  return new Promise((resolve) => {
    devices.forEach((dev, idx) => {
      const [event_name, _] = get_device_props(dev, null);
      document.addEventListener(event_name, onEventHandler);
      function onEventHandler(e) {
        document.removeEventListener(event_name, onEventHandler);
        const [_, return_value] = get_device_props(dev, e);
        resolve(return_value);
      }
    });
  });
}
