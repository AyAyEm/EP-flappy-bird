(() => {
  const randomRange = (initial, final) => Math.round((Math.random() * (final - initial)) + initial);
  const isInRange = (value, [initial, final = Infinity]) => value >= initial && value <= final;

  const addClass = (elements, className) => (
    elements.forEach((element) => element.classList.add(className)));

  const removeClass = (elements, className) => (
    elements.forEach((element) => element.classList.remove(className)));

  function isNumber(strElement) {
    if (strElement.length > 1) {
      return [...strElement].every(isNumber);
    }

    const charCode = strElement.charCodeAt(0);
    if (charCode >= 48 && charCode <= 57) return true;

    return false;
  }

  function splitNumber(str) {
    let [number, finalString] = ['', ''];
    for (let element of str) {
      if (isNumber(element) || ['.', '-'].includes(element)) {
        number += element;
      } else {
        finalString += element;
      }
    }

    return [+number, finalString];
  }

  function moveElement(element, { x = 0, y = 0, defaultUnit = '%' }) {
    if (x !== 0) {
      const [xPos, xUnit] = splitNumber(element.style.left || `0${defaultUnit}`);
      element.style.left = `${xPos + x}${xUnit}`;
    }

    if (y !== 0) {
      const [yPos, yUnit] = splitNumber(element.style.bottom || `0${defaultUnit}`);
      element.style.bottom = `${yPos + y}${yUnit}`;
    }
  }

  function startAnimation(element, coords, options) {
    const { toX = element.style.left, toY = element.style.bottom } = coords;
    const { time = 200, smoothness = 1 } = options || {};

    const defaultUnit = splitNumber(toX)[1] || splitNumber(toY)[1];

    const [fromX, fromY] = [splitNumber(element.style.left)[0], splitNumber(element.style.bottom)[0]];
    const [toXFactor, toYFactor] = [splitNumber(toX)[0], splitNumber(toY)[0]];
    const maxIterations = Math.max(
      Math.abs(toXFactor - fromX) * smoothness,
      Math.abs(toYFactor - fromY) * smoothness,
    );
    const [xPace, yPace] = [toXFactor / maxIterations, (toYFactor - fromY) / maxIterations];

    let [iterations, stop] = [0];
    const animation = new Promise((resolve) => {
      const interval = setInterval(() => {
        if (iterations < maxIterations) {
          moveElement(element, { x: xPace, y: yPace, defaultUnit });
          iterations += 1;
        } else {
          stop();
        }
      }, time / maxIterations);

      stop = () => {
        clearInterval(interval);
        resolve();

        return animation;
      };
    });

    return { then: animation.then.bind(animation), stop };
  }

  function recursiveAnimation(animationArgs) {
    const animation = startAnimation(...animationArgs);
    let toStop = false;
    animation.then(() => {
      if (toStop) return;
      recursiveAnimation(animationArgs)
    });

    const stop = () => {
      toStop = true;
      animation.stop();
    }

    return { then: animation.then.bind(animation), stop };

  }

  const game = {
    pause: true,
    events: {
      tick: new Event('game-tick'),
      over: new Event('game-over'),
      hit: new Event('game-hit'),
      point: new Event('game-point'),
      die: new Event('game-die'),
      start: new Event('game-start'),
    },
  };

  setInterval(() => {
    if (game.pause) return;

    document.dispatchEvent(game.events.tick);
  }, 25);

  document.addEventListener('game-over', () => {
    game.pause = true;
  });

  const scoreCounter = document.getElementById('score');
  document.addEventListener('game-start', () => {
    scoreCounter.innerHTML = 0;
    game.pause = false;
  });

  document.addEventListener('game-die', () => document.dispatchEvent(game.events.over));
  document.addEventListener('game-hit', () => document.dispatchEvent(game.events.over));
  document.addEventListener('game-point', () => scoreCounter.innerHTML = +scoreCounter.innerHTML + 1);

  /* audio */
  const sounds = (() => {
    const _sounds = {
      play(sound) {
        if (this[sound]) {
          this[sound].load();
          this[sound].play().catch(() => null);
        }
      },
    };

    const audios = document.querySelectorAll('audio');
    const soundBar = document.querySelector('#soundOptions input');
    audios.forEach((audio) => _sounds[audio.id] = audio);

    const updateAudiosVolume = () => audios.forEach((audio) => audio.volume = soundBar.value / 100);
    soundBar.addEventListener('input', updateAudiosVolume);
    updateAudiosVolume();

    document.addEventListener('game-die', () => _sounds.play('sfx-die'));
    document.addEventListener('game-hit', () => _sounds.play('sfx-hit'));
    document.addEventListener('game-point', () => _sounds.play('sfx-point'));

    return _sounds;
  })();

  /* container */
  (() => {
    const container = document.getElementById('flappy-container');
    container.addEventListener('click', (event) => {
      event.preventDefault();

      if (game.pause) document.dispatchEvent(game.events.start);
    });
  })();

  /* pipes */
  const pipes = (() => {
    const insertElementsInto = (parent, element) => parent.appendChild(element.cloneNode(true));

    function resetPipe(pipe) {
      const pieces = [...pipe.children];
      removeClass(pieces, 'occult');
      removeClass(pieces, 'disable-grow');

      pieces[pieces.length - 1].style.setProperty('height', '');
    }


    function randomPipeSize(pipe) {
      resetPipe(pipe);

      const maxHeight = pipe.clientHeight;
      const innerHeight = pipe.children[2].clientHeight;
      const randomHeight = randomRange(0, maxHeight - innerHeight);
      const lastHeightDif = randomHeight / randomPipeSize.lastHeight;
      if (isInRange(lastHeightDif, [0.9, 1.1])) {
        randomPipeSize(pipe);
        return;
      } else {
        randomPipeSize.lastHeight = randomHeight;
      }



      if (randomHeight > (maxHeight - 20 - innerHeight)) {
        addClass([pipe.children[0], pipe.children[1]], 'occult');
      } else if (randomHeight < 20) {
        addClass([pipe.children[3], pipe.children[4]], 'occult');
      } else {
        addClass([pipe.children[4]], 'disable-grow');
        pipe.children[4].style.height = `${randomHeight}px`;
      }
    }
    randomPipeSize.lastHeight = 0;

    function randomizePipeContainer(container) {
      if (Array.isArray(container)) {
        container.forEach(randomizePipeContainer);
        return;
      }

      [...container.children].forEach(randomPipeSize);
    }

    const pipe = document.querySelector('div.pipe');
    Array.from({ length: 3 }, () => insertElementsInto(pipe.parentElement, pipe));

    let pipeContainer = document.querySelector('div.pipes');
    let pipeContainerExtra = pipeContainer.insertAdjacentElement('afterend', pipeContainer.cloneNode(true));

    document.addEventListener('game-start', () => {
      randomizePipeContainer([pipeContainer, pipeContainerExtra]);
      pipeContainer.style.left = '100%';
      pipeContainerExtra.style.left = '120%';
    });

    document.addEventListener('game-tick', () => {
      if (splitNumber(pipeContainer.style.left)[0] < -100) {
        const extra = pipeContainerExtra;
        pipeContainerExtra = pipeContainer;
        pipeContainer = extra;

        pipeContainerExtra.style.left = '120%';
      }

      if (splitNumber(pipeContainer.style.left)[0] <= 0) {
        moveElement(pipeContainerExtra, { x: -0.25 });
      }

      moveElement(pipeContainer, { x: -0.25 });
    });

    return Array.from(document.querySelectorAll('div.pipe'));
  })();

  /* bird */
  const bird = (() => {
    const rotateBird = (rotation) => (bird.style.transform = `rotate(${rotation}deg)`);

    const bird = document.querySelector('#bird');

    document.addEventListener('game-start', () => {
      rotateBird(0);
      bird.style.bottom = '49%';
    });

    let [goingUp, goingUpTimeout] = [false];
    const goUp = (heightValue, speedFactor = 1) => {
      if (goingUpTimeout) clearTimeout(goingUpTimeout);

      goingUp = true;
      rotateBird(-45);

      const actualHeight = splitNumber(bird.style.bottom)[0];
      const animation = startAnimation(
        bird,
        { toY: `${actualHeight + heightValue}%` },
        { time: 200 / speedFactor },
      );

      animation.then(() => {
        goingUpTimeout = setTimeout(() => {
          goingUp = false
          rotateBird(0);
        }, 50);
      });

      return animation;
    }

    let goingDown = false;
    const goDown = (heightValue, speedFactor = 1) => {
      goingDown = true;
      rotateBird(45);

      const actualHeight = splitNumber(bird.style.bottom)[0];
      const animation = startAnimation(
        bird,
        { toY: `${actualHeight - heightValue}%` },
        { time: 200 / speedFactor },
      );

      animation.then(() => {
        goingDown = false;
      });

      return animation;
    }

    let lastDown;
    document.addEventListener('game-tick', () => {
      if (splitNumber(bird.style.bottom)[0] < 4) {
        document.dispatchEvent(game.events.die);
        return;
      }

      if (!goingUp && !goingDown) {
        lastDown = goDown(5, 3);
      }
    });

    let lastUp;
    document.addEventListener('keydown', (event) => {
      if (game.pause) return;

      if (event.key === 'w') {
        if (goingDown) {
          lastDown.stop();
        }

        if (lastUp) {
          lastUp.stop()
            .then(() => lastUp = goUp(20));
        } else {
          lastUp = goUp(10);
        }
        lastUp.then(() => lastUp = undefined);

        sounds.play('sfx-wing');
      }

      if (event.key === 's') {
        if (lastDown) {
          lastDown.stop()
            .then(() => lastDown = goDown(20));
        } else {
          lastDown = goDown(20);
        }

        sounds.play('sfx-wing');
      }
    });

    return bird;
  })();

  /* 
    If the bird overlaps a pipe it's a game-over
    If the bird overlaps the end of the middle it's a point
  */
  (() => {
    let pointTimeout = Date.now();
    document.addEventListener('game-tick', () => {
      const birdRect = bird.getBoundingClientRect();

      let point = false;
      const overlaps = pipes.find((pipe) => {
        const pipeRect = pipe.getBoundingClientRect();

        const xOverlap = isInRange(
          birdRect.right, [pipeRect.x, pipeRect.right + birdRect.width]);

        if (!xOverlap) return;

        const middleRect = pipe.querySelector('div.pipe-middle').getBoundingClientRect();

        const yOverlap = isInRange(
          birdRect.y, [middleRect.y + 2, middleRect.bottom + 2]);


        if (xOverlap && !yOverlap) return true;

        const pointOverlap = isInRange(
          birdRect.right, [pipeRect.right, pipeRect.right + birdRect.width / 2]);

        if (pointOverlap) point = true;
      });

      if (overlaps) {
        document.dispatchEvent(game.events.hit);
        return;
      }

      if (point && (Date.now() - pointTimeout) > 500) {
        pointTimeout = Date.now();
        document.dispatchEvent(game.events.point);
      }
    });
  })();

  document.dispatchEvent(game.events.start);
})();
