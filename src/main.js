import { initScene } from './core/scene.js';
import { initPaddle } from './entities/paddle.js';
import { initBall } from './entities/ball.js';
import { initAudioSystem } from './audio/index.js';
import { paddleProfiles as paddleProfilesConfig } from './config/paddles.js';
import { createDifficultyProfiles } from './config/difficulties.js';

const canvas = document.getElementById('game-canvas');
const sceneSetup = initScene({ window, canvas });
const {
  scene,
  camera,
  renderer,
  clock,
  cameraBasePosition,
  themeGroup,
  light,
  ambientLight,
  backgroundUniforms,
  backgroundSphere,
  textureLoader,
  getRGBELoader,
  getGLTFLoader,
  getParticleTexture,
  getBrickTexture,
  applySkyTexture,
  setSkyTexture,
} = sceneSetup;

const cameraTarget = new THREE.Vector3(0, 0, 0);
camera.lookAt(cameraTarget);

const paddleSetup = initPaddle({ scene, getGLTFLoader });
const {
  paddle,
  placeholderMaterial: paddlePlaceholderMaterial,
  glowMaterial: paddleGlowMaterial,
  frameMaterial: paddleFrameMaterial,
  strutMaterial: paddleStrutMaterial,
  light: paddleLight,
  placeholderParts: paddlePlaceholderParts,
} = paddleSetup;

const ballSetup = initBall({ scene });
const {
  ball,
  ballMaterial,
  ballGlow,
  ballLight,
  ballBaseColor,
  ballBaseEmissive,
  ballBaseEmissiveIntensity,
  ballGlowBaseColor,
  ballGlowBaseOpacity,
  ballLightBaseColor,
  ballLightBaseIntensity,
} = ballSetup;

const measurePaddleHitRadius = () => {
  const bbox = new THREE.Box3().setFromObject(paddle);
  const size = bbox.getSize(new THREE.Vector3());
  return size.x ? Math.max(2.6, size.x / 2) : 3.2;
};

const paddleState = {
  hitRadius: measurePaddleHitRadius(),
  velocity: 0,
  targetX: paddle.position.x,
  mouseTargetX: 0,
  mouseControlActive: false,
  smoothFactor: 0.18,
  speedCap: 2.4,
};

var paddleProfiles = paddleProfilesConfig;

// Bricks group
        var blockGeometry = new THREE.BoxGeometry(1, 0.6, 0.5, 2, 2, 2);
        var brickGroup = new THREE.Group();
        scene.add(brickGroup);
        var blocks = [];

        // Game state & HUD
        var gameState = 'menu'; // 'menu' | 'playing' | 'paused' | 'gameover'
        var score = 0;
        var defaultLives = 3;
        var lives = defaultLives;
        var level = 1;
        var achievements = {};
        var powerUps = [];
        var bestScore = loadBestScore();
        var comboCount = 0;
        var comboTimeout = null;
        var comboResetDelay = 1800;
        var quest = createQuest();
        var totalBlocksDestroyed = 0;

        var currentTheme = null;
        var currentThemeModel = null;
        var currentThemeBaseY = 0;
        var stageBanner = document.getElementById('scene-banner');
        var currentThemeMixer = null;
        var currentThemeAnimation = null;
        var fireParticles = null;
        var fireParticleData = [];
        var fireParticlePositions = null;
        var iceParticles = null;
        var iceParticleData = [];
        var iceParticlePositions = null;
        var slowParticles = null;
        var slowParticleData = null;
        var brickBursts = [];
        var wizzEffects = [];
        var fadingBlocks = [];
        var difficultyProfiles = createDifficultyProfiles(defaultLives);

        var selectedPaddleKey = null;
        var selectedPaddleProfile = null;
        var selectedDifficultyKey = 'nebula';
        var abilityCooldownEnd = 0;
        var abilityActiveUntil = 0;
        var abilityReady = false;
        var abilityState = {
          fireballActive: false,
          fireballEnd: 0,
          fireballRadius: 2.5,
          slowTimeActive: false,
          slowEnd: 0,
          slowFactor: 0.5,
          iceWallActive: false,
          iceWallEnd: 0,
          iceWallMesh: null
        };
        var iceWallY = -11.3;

        function getSelectedDifficulty(){
          return difficultyProfiles[selectedDifficultyKey] || difficultyProfiles.nebula;
        }

        var ballDirection = new THREE.Vector3(0.7, 0.7, 0).normalize();
        var defaultBaseBallSpeed = 0.28;
        var defaultMaxBallSpeed = 0.62;
        var defaultBallSpeedGrowth = 0.015;
        var baseBallSpeed = defaultBaseBallSpeed;
        var ballSpeed = baseBallSpeed;
        var maxBallSpeed = defaultMaxBallSpeed;
        var ballSpeedGrowth = defaultBallSpeedGrowth;
        var tempVec1 = new THREE.Vector3();
        var tempVec2 = new THREE.Vector3();
        var playfieldHalfWidth = 28.5;

        function updateHUD(){
          document.getElementById('score').textContent = score;
          document.getElementById('lives').textContent = lives;
          document.getElementById('level').textContent = level;
          document.getElementById('best-score').textContent = bestScore;
          var comboValue = 'x' + comboMultiplier();
          var comboEl = document.getElementById('combo');
          comboEl.textContent = comboValue;
          if(comboMultiplier() > 1){ comboEl.classList.add('alert'); } else { comboEl.classList.remove('alert'); }

          var keys = Object.keys(achievements).filter(k => achievements[k]).join(', ');
          document.getElementById('ach-list').textContent = keys.length ? keys : '—';
          updateQuestHUD();
          refreshScoreboard();
        }

        function showMessage(text, timeout){
          var el = document.getElementById('message');
          el.textContent = text;
          el.style.display = 'block';
          if(timeout) setTimeout(()=> el.style.display='none', timeout);
        }

        function loadBestScore(){
          try {
            var stored = window.localStorage.getItem('breaker-best-score');
            return stored ? parseInt(stored, 10) || 0 : 0;
          } catch(err) {
            console.warn('Stockage local indisponible', err);
            return 0;
          }
        }

        function saveBestScore(value){
          if(value > bestScore){
            bestScore = value;
            try { window.localStorage.setItem('breaker-best-score', bestScore); }
            catch(err){ console.warn('Impossible de sauvegarder le meilleur score', err); }
          }
        }

        function comboMultiplier(){
          return Math.max(1, 1 + Math.floor(comboCount / 3));
        }

        function resetCombo(){
          comboCount = 0;
          if(comboTimeout) { clearTimeout(comboTimeout); comboTimeout = null; }
        }

        function setBallDirection(x, y){
          var dir = new THREE.Vector3(x, y, 0);
          if(dir.lengthSq() === 0){
            dir.set(0.0001, 1, 0);
          }
          ballDirection.copy(dir.normalize());
        }

        function randomizeBallDirection(){
          var minAngle = THREE.Math.degToRad(35);
          var maxAngle = THREE.Math.degToRad(70);
          var angle = minAngle + Math.random() * (maxAngle - minAngle);
          var horizontal = Math.random() < 0.5 ? -1 : 1;
          setBallDirection(Math.sin(angle) * horizontal, Math.cos(angle));
          stabiliseBallDirection();
        }

        function resetBallPosition(){
          ball.position.set(0, -8, 0);
          randomizeBallDirection();
          ballSpeed = baseBallSpeed;
        }

        function stabiliseBallDirection(minY){
          minY = minY || 0.24;
          if(Math.abs(ballDirection.y) < minY){
            ballDirection.y = minY * (ballDirection.y >= 0 ? 1 : -1 || 1);
          }
          ballDirection.normalize();
        }

        function accelerateBall(multiplier){
          ballSpeed = Math.min(maxBallSpeed, ballSpeed * multiplier);
        }

        function boostCombo(){
          comboCount++;
          if(comboTimeout) clearTimeout(comboTimeout);
          comboTimeout = setTimeout(function(){ resetCombo(); updateHUD(); }, comboResetDelay);
        }

        function createQuest(){
          var target = 15 + Math.floor(Math.random() * 10);
          var reward = 120 + target * 8;
          return {
            description: 'Break ' + target + ' bricks',
            target: target,
            progress: 0,
            reward: reward,
            completed: false
          };
        }

        function updateQuestHUD(){
          var questEl = document.getElementById('quest');
          if(!quest){ questEl.textContent = '—'; return; }
          var progressText = quest.completed ? 'Done! +' + quest.reward : quest.progress + '/' + quest.target;
          if(!quest.completed) progressText += ' | +' + quest.reward;
          questEl.textContent = quest.description + ' (' + progressText + ')';
        }

        function tryCompleteQuest(){
          if(quest && !quest.completed && quest.progress >= quest.target){
            quest.completed = true;
            score += quest.reward;
            saveBestScore(score);
            showMessage('Quest complete! +' + quest.reward + ' pts', 2200);
            updateHUD();
            setTimeout(function(){ quest = createQuest(); updateQuestHUD(); }, 2500);
          }
        }

        function resetQuest(){
          quest = createQuest();
          updateQuestHUD();
        }

        function setSceneBanner(text){
          stageBanner.textContent = text;
          stageBanner.style.opacity = 1;
          setTimeout(function(){ stageBanner.style.opacity = 0.55; }, 1600);
        }

        var selectionModal = document.getElementById('paddle-select');
        var paddleCards = Array.prototype.slice.call(document.querySelectorAll('.paddle-card'));
        var selectConfirm = document.getElementById('select-confirm');
        var paddleDetails = document.getElementById('paddle-details');
        var abilityStatusEl = document.getElementById('ability-status');
        var scoreboardModal = document.getElementById('scoreboard-modal');
        var scoreboardSummary = document.getElementById('scoreboard-summary');
        var scoreboardScore = document.getElementById('scoreboard-score');
        var scoreboardBest = document.getElementById('scoreboard-best');
        var scoreboardLevel = document.getElementById('scoreboard-level');
        var scoreboardBtn = document.getElementById('scoreboard-btn');
        var scoreboardContinue = document.getElementById('scoreboard-continue');
        var scoreboardClose = document.getElementById('scoreboard-close');
        var scoreboardSaveSection = document.getElementById('scoreboard-save-section');
        var scoreboardNameInput = document.getElementById('scoreboard-name');
        var scoreboardSaveButton = document.getElementById('scoreboard-save');
        var scoreboardList = document.getElementById('scoreboard-list');
        var scoreboardPendingCallback = null;
        var scoreboardPreviousState = null;
        var scoreboardCurrentMode = 'summary';
        var scoreboardSavedThisRound = true;
        var SCOREBOARD_STORAGE_KEY = 'breaker-scoreboard';
        var PLAYER_NAME_STORAGE_KEY = 'breaker-player-name';
        var scoreboardEntries = loadScoreboardEntries();
        var lastPlayerName = loadLastPlayerName();
        var pausedBySelectionModal = false;
        var pausedByLevelModal = false;

        if(scoreboardBtn){
          scoreboardBtn.addEventListener('click', function(){
            openScoreboard('Current run', { pauseState: 'paused', mode: 'summary' });
          });
        }
        if(scoreboardClose){
          scoreboardClose.addEventListener('click', function(){
            if(scoreboardPendingCallback){
              closeScoreboard(true);
            } else {
              closeScoreboard(false);
            }
          });
        }
        if(scoreboardContinue){
          scoreboardContinue.addEventListener('click', function(){
            closeScoreboard(true);
          });
        }
        if(scoreboardModal){
          scoreboardModal.addEventListener('click', function(evt){
            if(evt.target === scoreboardModal && !scoreboardPendingCallback){
              closeScoreboard(false);
            }
          });
        }
        if(scoreboardSaveButton){
          scoreboardSaveButton.addEventListener('click', function(){
            saveScoreboardEntry();
          });
        }
        if(scoreboardNameInput){
          scoreboardNameInput.addEventListener('keydown', function(evt){
            if(evt.key === 'Enter'){
              evt.preventDefault();
              saveScoreboardEntry();
            }
          });
        }

        refreshScoreboard();

        function openSelectionModal(){
          selectionModal.classList.remove('hidden');
          if(gameState === 'playing'){
            gameState = 'paused';
            pausedBySelectionModal = true;
          }
          if(audioState.enabled){
            queueThemeMusic({ name: 'Start Screen' });
            if(!audioState.unlocked){
              ensureAudioReady(true);
            }
          }
          highlightSelectedPaddleCard();
        }

        function closeSelectionModal(){
          selectionModal.classList.add('hidden');
          if(pausedBySelectionModal && gameState !== 'scoreboard'){
            gameState = 'playing';
          }
          pausedBySelectionModal = false;
        }

        function applyPaddleProfile(key){
          var profile = paddleProfiles[key];
          if(!profile) return;
          selectedPaddleKey = key;
          selectedPaddleProfile = profile;
          paddle.scale.set(profile.scale, 1, 1);
          paddleState.smoothFactor = profile.smooth;
          paddleState.speedCap = profile.speedCap;
          paddlePlaceholderMaterial.color.setHex(profile.colors.primary);
          paddlePlaceholderMaterial.emissive.setHex(profile.colors.emissive);
          paddleGlowMaterial.color.setHex(profile.colors.glow);
          paddleFrameMaterial.color.setHex(0xffffff);
          paddleFrameMaterial.emissive.setHex(profile.colors.glow);
          paddleFrameMaterial.emissiveIntensity = 0.28;
          paddleStrutMaterial.color.setHex(0xf8fafc);
          paddleStrutMaterial.emissive.setHex(profile.colors.emissive);
          paddleStrutMaterial.emissiveIntensity = 0.22;
          paddleLight.color.setHex(profile.colors.light);
          paddleLight.intensity = 1.5;
          updatePaddleHitRadius();
          clampPaddlePosition();
          paddleState.targetX = paddle.position.x;
          resetAbilityState();
          updateAbilityUI();
          updatePaddleButtonLabel();
        }

        function resetAbilityState(){
          abilityCooldownEnd = 0;
          abilityActiveUntil = 0;
          abilityReady = !!selectedPaddleProfile;
          abilityState.fireballActive = false;
          abilityState.fireballEnd = 0;
          abilityState.fireballRadius = 2.5;
          restoreBallAppearance();
          abilityState.slowTimeActive = false;
          abilityState.slowEnd = 0;
          abilityState.slowFactor = 0.5;
          deactivateIceWall();
          if(slowParticles) slowParticles.visible = false;
        }

        paddleCards.forEach(function(card){
          card.addEventListener('click', function(){
            paddleCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            var key = card.getAttribute('data-key');
            var profile = paddleProfiles[key];
            if(profile){
              paddleDetails.textContent = profile.description + ' — ability: ' + profile.ability.name + ' (press F)';
              selectConfirm.disabled = false;
              selectConfirm.setAttribute('data-key', key);
            }
          });
        });

        selectConfirm.addEventListener('click', function(){
          var key = selectConfirm.getAttribute('data-key');
          if(!key) return;
          applyPaddleProfile(key);
          closeSelectionModal();
        });

const audio = initAudioSystem({ window });
const {
  state: audioState,
  sfxPresets,
  musicPresets,
  musicTracks,
  initAudioEngine,
  applyAudioVolume,
  setMasterVolume,
  triggerTone,
  playSfx,
  stopThemeMusic,
  loadMusicBuffer,
  playProceduralMusic,
  startThemeMusic,
  ensureAudioReady,
  resumeMusic,
  pauseMusic,
  toggleAudio,
} = audio;

applyAudioVolume();

function queueThemeMusic(theme){
  if(!theme) return;
  var themeKey = theme.musicTheme || theme.name;
  if(!themeKey) return;
  audioState.pendingMusicTheme = themeKey;
  if(audioState.unlocked){
    startThemeMusic(themeKey);
  }
}

function loadScoreboardEntries(){
  try {
    var raw = window.localStorage.getItem(SCOREBOARD_STORAGE_KEY);
    if(raw){
      var parsed = JSON.parse(raw);
      if(Array.isArray(parsed)) return parsed.slice(0, 10);
    }
  } catch(err) {
    console.warn('Unable to load scoreboard', err);
  }
  return [];
}

function saveScoreboardEntries(){
  try {
    window.localStorage.setItem(SCOREBOARD_STORAGE_KEY, JSON.stringify(scoreboardEntries.slice(0, 10)));
  } catch(err) {
    console.warn('Unable to save scoreboard', err);
  }
}

function loadLastPlayerName(){
  try {
    return window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) || '';
  } catch(err) {
    return '';
  }
}

function storeLastPlayerName(name){
  try {
    window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
  } catch(err) { /* noop */ }
}

function escapeHtml(value){
  return String(value || '').replace(/[&<>"']/g, function(match){
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[match] || match;
  });
}

function refreshScoreboard(){
  if(scoreboardScore) scoreboardScore.textContent = score;
  if(scoreboardBest) scoreboardBest.textContent = bestScore;
  if(scoreboardLevel) scoreboardLevel.textContent = level;
  if(scoreboardList){
    if(scoreboardEntries.length){
      scoreboardList.innerHTML = scoreboardEntries.map(function(entry, index){
        return '<li><span class="rank">' + (index + 1) + '.</span><span class="name">' + escapeHtml(entry.name) + '</span><span class="score">' + entry.score + '</span><span class="level">Lvl ' + entry.level + '</span></li>';
      }).join('');
    } else {
  scoreboardList.innerHTML = '<li class="empty">No scores yet</li>';
    }
  }
  if(scoreboardSaveSection){
    if(scoreboardCurrentMode === 'gameOver'){
      scoreboardSaveSection.classList.add('active');
      if(scoreboardSavedThisRound){
        scoreboardSaveSection.classList.add('saved');
      } else {
        scoreboardSaveSection.classList.remove('saved');
      }
    } else {
      scoreboardSaveSection.classList.remove('active');
      scoreboardSaveSection.classList.remove('saved');
    }
  }
  if(scoreboardNameInput && scoreboardCurrentMode === 'gameOver' && !scoreboardSavedThisRound){
    scoreboardNameInput.value = lastPlayerName || '';
  }
  if(scoreboardSaveButton){
    scoreboardSaveButton.disabled = (scoreboardCurrentMode !== 'gameOver') || scoreboardSavedThisRound;
    scoreboardSaveButton.textContent = scoreboardSavedThisRound ? 'Saved' : 'Save score';
  }
  if(scoreboardContinue){
    if(scoreboardPendingCallback){
      if(scoreboardCurrentMode === 'gameOver' && !scoreboardSavedThisRound){
        scoreboardContinue.style.display = 'none';
      } else {
        scoreboardContinue.style.display = 'inline-flex';
      }
    } else {
      scoreboardContinue.style.display = 'none';
    }
  }
  if(scoreboardClose){
    if(scoreboardCurrentMode === 'gameOver'){
      scoreboardClose.style.display = scoreboardSavedThisRound ? 'inline-flex' : 'none';
    } else {
      scoreboardClose.style.display = 'inline-flex';
    }
  }
}

function openScoreboard(summary, options){
  if(!scoreboardModal) return;
  options = options || {};
  scoreboardCurrentMode = options.mode || 'summary';
  scoreboardSavedThisRound = scoreboardCurrentMode !== 'gameOver';
  scoreboardPreviousState = null;
  if(options.pauseState){
    scoreboardPreviousState = gameState;
    gameState = options.pauseState;
  }
  scoreboardPendingCallback = options.onContinue || null;
  if(scoreboardSummary){ scoreboardSummary.textContent = summary || ''; }
  refreshScoreboard();
  scoreboardModal.classList.remove('hidden');
  if(scoreboardCurrentMode === 'gameOver' && scoreboardNameInput){
    setTimeout(function(){ scoreboardNameInput.focus(); }, 120);
  }
}

function closeScoreboard(triggerCallback){
  if(!scoreboardModal) return;
  if(scoreboardCurrentMode === 'gameOver' && !scoreboardSavedThisRound){
    return;
  }
  scoreboardModal.classList.add('hidden');
  if(scoreboardSummary){ scoreboardSummary.textContent = ''; }
  if(scoreboardPreviousState !== null && gameState !== 'scoreboard'){
    gameState = scoreboardPreviousState;
  }
  scoreboardPreviousState = null;
  var callback = scoreboardPendingCallback;
  scoreboardPendingCallback = null;
  if(triggerCallback && typeof callback === 'function'){
    callback();
  }
}

function saveScoreboardEntry(){
  if(scoreboardCurrentMode !== 'gameOver' || !scoreboardSaveSection || scoreboardSavedThisRound) return;
  var name = scoreboardNameInput ? scoreboardNameInput.value.trim() : '';
  if(!name) name = 'Player';
  lastPlayerName = name;
  storeLastPlayerName(name);
  scoreboardEntries.push({ name: name, score: score, level: level, time: Date.now() });
  scoreboardEntries.sort(function(a, b){
    if(b.score === a.score){ return a.time - b.time; }
    return b.score - a.score;
  });
  scoreboardEntries = scoreboardEntries.slice(0, 10);
  saveScoreboardEntries();
  scoreboardSavedThisRound = true;
  refreshScoreboard();
  if(scoreboardPendingCallback && scoreboardContinue){
    scoreboardContinue.style.display = 'inline-flex';
  }
  if(scoreboardClose){ scoreboardClose.style.display = 'inline-flex'; }
}


        function enterMenuState(customMessage){
          stopThemeMusic();
          queueThemeMusic({ name: 'Start Screen' });
          scoreboardCurrentMode = 'summary';
          scoreboardSavedThisRound = true;
          refreshScoreboard();
          gameState = 'menu';
          var profile = getSelectedDifficulty();
          score = 0;
          level = profile.startLevel;
          lives = profile.lives;
          buildLevel({ preview: true });
          updateHUD();
          var prompt = customMessage || 'Select a level and paddle to start';
          showMessage(prompt);
          if(customMessage){
            setTimeout(function(){
              if(gameState === 'menu'){
                showMessage('Select a level and paddle to start');
              }
            }, 4200);
          }
          if(stageBanner){
            stageBanner.textContent = profile.name;
            stageBanner.style.opacity = 0.85;
          }
          if(audioState.enabled && audioState.unlocked){
            ensureAudioReady(true);
            resumeMusic();
          }
          updateDifficultyInfo();
        }

        THREE.Cache.enabled = true;

        var sceneThemes = [
          {
            name: 'Synthwave Nebula',
            clearColor: 0x0b1120,
            fog: { near: 45, far: 120 },
            ambientColor: 0x1e40af,
            ambientIntensity: 0.9,
            keyColor: 0xf97316,
            keyIntensity: 1.4,
            floorColor: 0x172554,
            modelUrl: 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
            modelScale: [4.2, 4.2, 4.2],
            modelPosition: { x: 12, y: 4.5, z: -6 },
            animation: 'spin',
            background: {
              sky: 'https://images.pexels.com/photos/33931023/pexels-photo-33931023.png?cs=srgb&dl=pexels-adrian-monserrat-2155860644-33931023.jpg&fm=jpg&w=1280&h=1280',
              brick: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1024'
            }
          },
          {
            name: 'Cosmic Garden',
            clearColor: 0x02140c,
            fog: { near: 35, far: 90 },
            ambientColor: 0x16a34a,
            ambientIntensity: 0.8,
            keyColor: 0x4ade80,
            keyIntensity: 1.2,
            floorColor: 0x0f5132,
            modelUrl: 'https://threejs.org/examples/models/gltf/Flamingo.glb',
            modelScale: [0.06, 0.06, 0.06],
            modelPosition: { x: -14, y: 5.5, z: -8 },
            animation: 'float',
            background: {
              sky: 'https://images.pexels.com/photos/87009/earth-soil-creep-moon-lunar-surface-87009.jpeg?cs=srgb&dl=pexels-pixabay-87009.jpg&fm=jpg&w=1024&h=1024',
              brick: 'https://images.pexels.com/photos/259915/pexels-photo-259915.jpeg?auto=compress&cs=tinysrgb&w=1024'
            }
          },
          {
            name: 'Orbital Station',
            clearColor: 0x0a0a0f,
            fog: { near: 60, far: 160 },
            ambientColor: 0x64748b,
            ambientIntensity: 0.85,
            keyColor: 0x38bdf8,
            keyIntensity: 1.3,
            floorColor: 0x1f2937,
            modelUrl: 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
            modelScale: [1.4, 1.4, 1.4],
            modelPosition: { x: 11, y: 3.2, z: -7 },
            animation: 'hover',
            animationClips: ['Dance', 'Jump', 'Wave', 'Walk'],
            animationPause: 700,
            animationFade: 0.4,
            background: {
              sky: 'https://images.pexels.com/photos/586030/pexels-photo-586030.jpeg?cs=srgb&dl=pexels-spacex-586030.jpg&fm=jpg&h=1024&w=1536&fit=crop',
              brick: 'https://images.pexels.com/photos/220326/pexels-photo-220326.jpeg?auto=compress&cs=tinysrgb&w=1024'
            }
          },
          {
            name: 'Aurora Peaks',
            clearColor: 0x0d1627,
            fog: { near: 65, far: 200 },
            ambientColor: 0xb6d7ff,
            ambientIntensity: 0.9,
            keyColor: 0x7dd3fc,
            keyIntensity: 1.25,
            floorColor: 0x10253a,
            modelUrl: 'https://threejs.org/examples/models/gltf/Fox/glTF/Fox.gltf',
            modelScale: [0.05, 0.05, 0.05],
            modelPosition: { x: -6, y: 2.6, z: -5 },
            animation: 'float',
            background: {
              sky: 'https://images.pexels.com/photos/12561726/pexels-photo-12561726.jpeg?cs=srgb&dl=pexels-keith-hah-255747178-12561726.jpg&fm=jpg&h=1152&w=1536&fit=crop',
              brick: 'https://images.pexels.com/photos/1450082/pexels-photo-1450082.jpeg?auto=compress&cs=tinysrgb&w=1024'
            }
          },
          {
            name: 'Desert Mirage',
            clearColor: 0x2b1703,
            fog: { near: 70, far: 210 },
            ambientColor: 0xfacc15,
            ambientIntensity: 0.7,
            keyColor: 0xff8a4c,
            keyIntensity: 1.4,
            floorColor: 0x8c4b16,
            modelUrl: 'https://threejs.org/examples/models/gltf/Horse.glb',
            modelScale: [1.6, 1.6, 1.6],
            modelPosition: { x: 9, y: 1.4, z: -6 },
            animation: 'hover',
            animationClips: ['Walk', 'Trot', 'Gallop'],
            animationPause: 1200,
            animationFade: 0.6,
            background: {
              sky: 'https://images.pexels.com/photos/33915399/pexels-photo-33915399.jpeg?cs=srgb&dl=pexels-martin-2155758676-33915399.jpg&fm=jpg&w=1280&h=1280',
              brick: 'https://images.pexels.com/photos/1005644/pexels-photo-1005644.jpeg?auto=compress&cs=tinysrgb&w=1024'
            }
          },
          {
            name: 'Neon Shards',
            clearColor: 0x03020a,
            fog: { near: 80, far: 240 },
            ambientColor: 0x1f27ff,
            ambientIntensity: 0.8,
            keyColor: 0xff4d94,
            keyIntensity: 1.45,
            floorColor: 0x111332,
            modelUrl: 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
            modelScale: [1.1, 1.1, 1.1],
            modelPosition: { x: -9, y: 2.8, z: -5 },
            animation: 'hover',
            animationClips: ['Dance', 'Wave'],
            animationPause: 900,
            animationFade: 0.5,
            background: {
              sky: 'https://images.pexels.com/photos/19110325/pexels-photo-19110325.jpeg?cs=srgb&dl=pexels-icecloudxx-572772944-19110325.jpg&fm=jpg&w=1280&h=2275',
              brick: 'https://images.pexels.com/photos/373912/pexels-photo-373912.jpeg?auto=compress&cs=tinysrgb&w=1024'
            }
          }
        ];

        function hslColor(h, s, l){
          var color = new THREE.Color();
          color.setHSL(h, s, l);
          return color;
        }

        function updatePaddleHitRadius(){
          paddleState.hitRadius = measurePaddleHitRadius();
        }

        function enablePlaceholderPaddle(){
          paddlePlaceholderParts.forEach(function(mesh){ mesh.visible = true; });
          updatePaddleHitRadius();
        }

        function loadPaddleModel(){
          // Decorative booster fins
          var finMaterial = new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x2563eb, emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.22 });
          for(var i=-1;i<=1;i+=2){
            var fin = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 16), finMaterial);
            fin.rotation.z = Math.PI/2;
            fin.position.set(i*2.9, 0, -0.6);
            paddle.add(fin);
            paddlePlaceholderParts.push(fin);
          }
          enablePlaceholderPaddle();
        }

        function clampPaddlePosition(){
          var limit = playfieldHalfWidth - paddleState.hitRadius;
          paddle.position.x = THREE.Math.clamp(paddle.position.x, -limit, limit);
          paddleState.targetX = THREE.Math.clamp(paddleState.targetX, -limit, limit);
        }

        var levelLayouts = [
          function classicLayout(currentLevel, addBlock){
            var width = Math.min(14 + Math.floor(currentLevel * 0.8), 22);
            var height = Math.min(6 + Math.floor(currentLevel / 2), 9);
            var spacing = 1.35;
            for (var i = -Math.floor(width/2); i < Math.ceil(width/2); i++) {
              for (var j = 0; j < height; j++) {
                var hue = 0.55 + (j/height) * 0.15;
                addBlock(i * spacing, j * spacing + 2.2, hslColor(hue % 1, 0.65, 0.52));
              }
            }
          },
          function waveLayout(currentLevel, addBlock){
            var columns = 14 + currentLevel * 2;
            for(var k=0; k<columns; k++){
              var x = (k - columns/2) * 1.5;
              for(var row=0; row<3 + Math.floor(currentLevel/2); row++){
                var y = row * 1.6 + Math.sin((k / 2) + currentLevel) * 1.4 + 3;
                var hue = 0.05 + (k / columns) * 0.25;
                addBlock(x, y, hslColor(hue % 1, 0.7, 0.5));
              }
            }
          },
          function pyramidLayout(currentLevel, addBlock){
            var rows = Math.min(7 + Math.floor(currentLevel / 2), 10);
            var spacing = 1.5;
            for(var row=0; row<rows; row++){
              var blocksInRow = rows - row + 2;
              for(var col=0; col<blocksInRow; col++){
                var x = (col - blocksInRow / 2) * spacing;
                var y = row * spacing + 2.5;
                var hue = 0.7 + (row / rows) * 0.1;
                addBlock(x, y, hslColor(hue % 1, 0.5, 0.58));
              }
            }
          }
        ];

        function buildLevel(options){
          options = options || {};
          while (brickGroup.children.length) brickGroup.remove(brickGroup.children[0]);
          blocks.length = 0;
          var theme = sceneThemes[(level - 1) % sceneThemes.length];
          var brickTexture = theme && theme.background ? getBrickTexture(theme.background.brick) : null;

          var addBlock = function(x, y, color){
            var baseColor = color && color.isColor ? color.clone() : new THREE.Color(color || 0xffffff);
            var emissiveColor = baseColor.clone().multiplyScalar(0.18);
            baseColor.offsetHSL(0, 0, (Math.random() - 0.5) * 0.05);
            var blockMaterial = new THREE.MeshStandardMaterial({
              color: baseColor,
              metalness: 0.34,
              roughness: 0.46,
              emissive: emissiveColor
            });
            if(brickTexture){
              blockMaterial.map = brickTexture;
              blockMaterial.needsUpdate = true;
            }
            var block = new THREE.Mesh(blockGeometry, blockMaterial);
            block.castShadow = true;
            block.receiveShadow = true;
            block.position.set(x, y, 0);
            brickGroup.add(block);
            blocks.push(block);
          };

          var layoutIndex = (level - 1) % levelLayouts.length;
          levelLayouts[layoutIndex](level, addBlock);
          applyTheme(level, options);
        }

        function applyTheme(nextLevel, options){
          options = options || {};
          var theme = sceneThemes[(nextLevel - 1) % sceneThemes.length];
          currentTheme = theme;
          currentThemeBaseY = theme.modelPosition.y;

          renderer.setClearColor(theme.clearColor);
          if(theme.fog){
            scene.fog = new THREE.Fog(new THREE.Color(theme.clearColor), theme.fog.near, theme.fog.far);
          } else {
            scene.fog = null;
          }

          ambientLight.color.setHex(theme.ambientColor);
          ambientLight.intensity = theme.ambientIntensity;
          light.color.setHex(theme.keyColor);
          light.intensity = theme.keyIntensity;

          if(currentThemeMixer){
            currentThemeMixer.stopAllAction();
            currentThemeMixer = null;
          }
          stopThemeAnimationCycle();
          currentThemeModel = null;
          while (themeGroup.children.length) themeGroup.remove(themeGroup.children[0]);
          var floorMaterial = new THREE.MeshPhongMaterial({ color: theme.floorColor || 0x222c4a, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
          var floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), floorMaterial);
          floor.rotation.x = -Math.PI/2;
          floor.position.set(0, -15.2, -12);
          themeGroup.add(floor);

          var wallMaterial = new THREE.MeshPhongMaterial({ color: 0x1b263b, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
          var wall = new THREE.Mesh(new THREE.PlaneGeometry(160, 110), wallMaterial);
          wall.position.set(0, 25, -40);
          themeGroup.add(wall);

          wall.visible = false;
          floor.material.map = null;
          floor.material.color.set(theme.floorColor || 0x222c4a);
          floor.material.opacity = 0.92;
          floor.material.needsUpdate = true;

          setSkyTexture(theme);

          loadThemeModel(theme);
          if(!options.preview){
            queueThemeMusic(theme);
          } else {
            queueThemeMusic({ name: 'Start Screen' });
          }
          setSceneBanner(theme.name);
        }

        function loadThemeModel(theme){
          getGLTFLoader(function(loader){
            if(!loader){
              console.warn('3D theme loading disabled (GLTFLoader missing).');
              return;
            }
            loader.load(theme.modelUrl, function(gltf){
              if(currentTheme !== theme) return;
              currentThemeModel = gltf.scene;
              currentThemeModel.scale.set(theme.modelScale[0], theme.modelScale[1], theme.modelScale[2]);
              currentThemeModel.position.set(theme.modelPosition.x, theme.modelPosition.y, theme.modelPosition.z);
              currentThemeModel.traverse(function(node){ if(node.isMesh){ node.receiveShadow = false; node.castShadow = false; } });
              themeGroup.add(currentThemeModel);
              currentThemeBaseY = theme.modelPosition.y;
              if(gltf.animations && gltf.animations.length){
                currentThemeMixer = new THREE.AnimationMixer(currentThemeModel);
                setupThemeAnimations(theme, gltf);
              } else {
                currentThemeMixer = null;
                stopThemeAnimationCycle();
              }
            }, undefined, function(err){
              currentThemeModel = null;
              currentThemeMixer = null;
              stopThemeAnimationCycle();
              console.warn('Unable to load theme model', err);
            });
          });
        }

        function stopThemeAnimationCycle(){
          if(currentThemeAnimation){
            if(currentThemeAnimation.timeout) clearTimeout(currentThemeAnimation.timeout);
            if(currentThemeAnimation.currentAction) currentThemeAnimation.currentAction.stop();
          }
          currentThemeAnimation = null;
        }

        function setupThemeAnimations(theme, gltf){
          stopThemeAnimationCycle();
          if(!currentThemeMixer) return;

          var clips = [];
          if(Array.isArray(theme.animationClips) && theme.animationClips.length){
            theme.animationClips.forEach(function(name){
              var clip = THREE.AnimationClip.findByName(gltf.animations, name);
              if(clip) clips.push(clip);
            });
          }
          if(!clips.length) clips = gltf.animations.slice();
          if(!clips.length) return;

          var actions = clips.map(function(clip){
            var action = currentThemeMixer.clipAction(clip);
            action.clampWhenFinished = true;
            action.setLoop(THREE.LoopOnce, 1);
            action.enabled = true;
            return { clip: clip, action: action };
          });

          currentThemeAnimation = {
            actions: actions,
            index: -1,
            fade: theme.animationFade !== undefined ? theme.animationFade : 0.6,
            pause: theme.animationPause !== undefined ? theme.animationPause : 1000,
            timeout: null,
            currentAction: null
          };

          cycleThemeAnimation();
        }

        function cycleThemeAnimation(){
          if(!currentThemeAnimation || !currentThemeAnimation.actions.length) return;
          var state = currentThemeAnimation;
          state.index = (state.index + 1) % state.actions.length;
          var entry = state.actions[state.index];
          var action = entry.action;

          if(state.currentAction && state.currentAction !== action){
            state.currentAction.fadeOut(state.fade);
          }

          action.reset();
          action.fadeIn(state.fade).play();
          state.currentAction = action;

          var duration = Math.max(0.5, entry.clip.duration || 0.5) * 1000;
          if(state.timeout) clearTimeout(state.timeout);
          state.timeout = setTimeout(cycleThemeAnimation, duration + state.pause);
        }

        function animateThemeModel(delta){
          if(currentThemeMixer) currentThemeMixer.update(delta);
          if(!currentThemeModel || !currentTheme || currentThemeMixer) return;
          var time = Date.now() * 0.001;
          if(currentTheme.animation === 'spin'){
            currentThemeModel.rotation.y += 0.003;
          } else if(currentTheme.animation === 'float'){
            currentThemeModel.rotation.y += 0.0025;
            currentThemeModel.position.y = currentThemeBaseY + Math.sin(time * 0.6) * 0.45;
          } else if(currentTheme.animation === 'hover'){
            currentThemeModel.rotation.y = Math.sin(time * 1.1) * 0.18;
            currentThemeModel.position.y = currentThemeBaseY + Math.sin(time * 1.6) * 0.24;
          }
        }
        // Power-up spawn: sphere that falls; collision with ball activates effect
        function spawnPowerUp(){
          var types = ['expand', 'life', 'score'];
          var type = types[Math.floor(Math.random() * types.length)];
          var palette = {
            expand: { color: 0xffd54f, emissive: 0xffb300, light: 0xffc566 },
            life: { color: 0x4ade80, emissive: 0x22c55e, light: 0x7ef4a5 },
            score: { color: 0x60a5fa, emissive: 0x3b82f6, light: 0x9ccfff }
          };
          var look = palette[type];

          var container = new THREE.Group();
          container.position.set((Math.random()*40)-20, 12, 0);

          var core = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.55, 0),
            new THREE.MeshStandardMaterial({
              color: look.color,
              emissive: look.emissive,
              emissiveIntensity: 0.75,
              metalness: 0.2,
              roughness: 0.35
            })
          );
          container.add(core);

          var halo = new THREE.Mesh(
            new THREE.SphereGeometry(0.85, 24, 18),
            new THREE.MeshBasicMaterial({ color: look.light, transparent: true, opacity: 0.22 })
          );
          container.add(halo);

          var light = new THREE.PointLight(look.light, 1.1, 10);
          light.position.set(0, 0, 0.4);
          container.add(light);

          container.userData = { type: type, core: core, halo: halo, light: light };
          scene.add(container);
          powerUps.push(container);
          // auto-remove after 12s
          setTimeout(()=>{
            var idx = powerUps.indexOf(container);
            if(idx>=0){
              scene.remove(container);
              powerUps.splice(idx,1);
            }
          }, 12000);
        }
        // spawn periodically when playing
        setInterval(()=>{ if(gameState==='playing' && Math.random()<0.6) spawnPowerUp(); }, 10000);

        // Input: keyboard + mouse
        var keyState = { left: false, right: false };
        document.addEventListener("keydown", function(event) {
          if(event.code==='Space'){
            if(gameState==='playing') { gameState='paused'; pauseMusic(); showMessage('Paused'); }
            else if(gameState==='paused'){ gameState='playing'; document.getElementById('message').style.display='none'; resumeMusic(); }
            updateAbilityUI();
            return;
          }
          if (event.code === "ArrowLeft" || event.code === 'KeyA'){ keyState.left = true; paddleState.mouseControlActive = false; }
          else if (event.code === "ArrowRight" || event.code === 'KeyD'){ keyState.right = true; paddleState.mouseControlActive = false; }
        });
        document.addEventListener("keyup", function(event){
          if (event.code === "ArrowLeft" || event.code === 'KeyA'){ keyState.left = false; }
          else if (event.code === "ArrowRight" || event.code === 'KeyD'){ keyState.right = false; }
          else if (event.code === 'KeyF'){ magicKeyPressed = false; }
          if(!keyState.left && !keyState.right){
            paddleState.targetX = paddleState.mouseControlActive ? paddleState.mouseTargetX : paddle.position.x;
          }
        });
        var magicKeyPressed = false;
        document.addEventListener('keydown', function(event){
          if(event.code === 'KeyF' && !magicKeyPressed){
            magicKeyPressed = true;
            activateMagicPower();
          }
        });
        window.addEventListener('mousemove', function(e){
          // convert screen x to world x (approx)
          var ratio = (e.clientX / window.innerWidth) * 2 - 1;
          var limit = playfieldHalfWidth - paddleState.hitRadius;
          paddleState.mouseTargetX = THREE.Math.clamp(ratio * playfieldHalfWidth, -limit, limit);
          paddleState.mouseControlActive = true;
          paddleState.targetX = paddleState.mouseTargetX;
        });

        // Buttons
        document.getElementById('start-btn').addEventListener('click', function(){ startGame(); });
        document.getElementById('pause-btn').addEventListener('click', function(){
          if(gameState==='playing'){ gameState='paused'; pauseMusic(); showMessage('Paused'); }
          else if(gameState==='paused'){ gameState='playing'; document.getElementById('message').style.display='none'; resumeMusic(); }
          updateAbilityUI();
        });
        document.getElementById('restart-btn').addEventListener('click', function(){
          window.location.href = window.location.origin + window.location.pathname;
        });
        document.getElementById('audio-btn').addEventListener('click', toggleAudio);
        var volumeSlider = document.getElementById('volume-range');
        volumeSlider.value = Math.round(audioState.volume * 100);
        volumeSlider.addEventListener('input', function(e){
          if(!audioState.unlocked && audioState.enabled) ensureAudioReady(true);
          setMasterVolume((parseInt(e.target.value, 10) || 0) / 100);
        });

        var levelModal = document.getElementById('level-select-modal');
        var levelCards = Array.prototype.slice.call(document.querySelectorAll('.level-card'));
        var levelConfirm = document.getElementById('level-confirm');
        var levelDetails = document.getElementById('level-details');
        var levelOpenBtn = document.getElementById('level-open-btn');
        var paddleOpenBtn = document.getElementById('paddle-open-btn');
        var difficultyInfoEl = document.getElementById('difficulty-info');
        var pendingDifficultyKey = selectedDifficultyKey;

        function describeDifficulty(profile){
          return profile.name + ' — ' + profile.description;
        }

        function updateDifficultyInfo(){
          var profile = getSelectedDifficulty();
          if(difficultyInfoEl) difficultyInfoEl.textContent = describeDifficulty(profile);
          if(levelOpenBtn) levelOpenBtn.textContent = 'Level: ' + profile.name;
          updatePaddleButtonLabel();
        }

        function refreshLevelCards(){
          levelCards.forEach(function(card){
            var key = card.getAttribute('data-key');
            card.classList.toggle('active', key === pendingDifficultyKey);
          });
          var profile = difficultyProfiles[pendingDifficultyKey] || getSelectedDifficulty();
          if(levelDetails) levelDetails.textContent = describeDifficulty(profile);
        }

        function openLevelModal(){
          pendingDifficultyKey = selectedDifficultyKey;
          refreshLevelCards();
          levelModal.classList.remove('hidden');
          if(gameState === 'playing'){
            gameState = 'paused';
            pausedByLevelModal = true;
          }
        }

        function closeLevelModal(){
          levelModal.classList.add('hidden');
          if(pausedByLevelModal && gameState !== 'scoreboard'){
            gameState = 'playing';
          }
          pausedByLevelModal = false;
        }

        function applyDifficultySelection(key){
          if(!difficultyProfiles[key]) return;
          selectedDifficultyKey = key;
          var profile = difficultyProfiles[key];
          updateDifficultyInfo();
          if(gameState === 'menu'){
            if(stageBanner) stageBanner.textContent = profile.name;
            level = profile.startLevel;
            lives = profile.lives;
            updateHUD();
            buildLevel({ preview: true });
          }
          if(gameState === 'menu' && audioState.enabled){
            queueThemeMusic({ name: 'Start Screen' });
            if(audioState.unlocked){
              resumeMusic();
            }
          }
        }

        levelCards.forEach(function(card){
          card.addEventListener('click', function(){
            pendingDifficultyKey = card.getAttribute('data-key');
            refreshLevelCards();
          });
        });

        if(levelConfirm){
          levelConfirm.addEventListener('click', function(){
            applyDifficultySelection(pendingDifficultyKey);
            closeLevelModal();
          });
        }

        if(levelOpenBtn){
          levelOpenBtn.addEventListener('click', function(){
            openLevelModal();
          });
        }

        function highlightSelectedPaddleCard(){
          paddleCards.forEach(function(card){
            card.classList.toggle('active', card.getAttribute('data-key') === selectedPaddleKey);
          });
          if(selectedPaddleKey){
            selectConfirm.disabled = false;
            selectConfirm.setAttribute('data-key', selectedPaddleKey);
            var profile = paddleProfiles[selectedPaddleKey];
            if(profile){
              paddleDetails.textContent = profile.description + ' — ability: ' + profile.ability.name + ' (press F)';
            }
          }
        }

        function updatePaddleButtonLabel(){
          if(!paddleOpenBtn) return;
          if(selectedPaddleProfile){
            paddleOpenBtn.textContent = 'Paddle: ' + selectedPaddleProfile.name;
          } else {
            paddleOpenBtn.textContent = 'Select Paddle';
          }
        }

        if(paddleOpenBtn){
          paddleOpenBtn.addEventListener('click', function(){
            highlightSelectedPaddleCard();
            openSelectionModal();
          });
        }

        if(levelModal){
          levelModal.addEventListener('click', function(evt){
            if(evt.target === levelModal){
              closeLevelModal();
            }
          });
        }

        updateDifficultyInfo();
        updatePaddleButtonLabel();

        function startGame(){
          if(!selectedPaddleProfile){
            openSelectionModal();
            showMessage('Choose a paddle to get started', 1800);
            return;
          }
          var difficulty = getSelectedDifficulty();
          stopThemeMusic();
          scoreboardCurrentMode = 'summary';
          scoreboardSavedThisRound = true;
          refreshScoreboard();
          ensureAudioReady(true);
          playSfx('levelUp');
          score = 0;
          level = difficulty.startLevel;
          lives = difficulty.lives;
          totalBlocksDestroyed = 0;
          resetCombo();
          resetQuest();
          while(powerUps.length){ var extra = powerUps.pop(); scene.remove(extra); }
          baseBallSpeed = defaultBaseBallSpeed * (difficulty.speedMultiplier || 1);
          maxBallSpeed = defaultMaxBallSpeed * (difficulty.maxSpeedMultiplier || 1);
          ballSpeedGrowth = defaultBallSpeedGrowth * (difficulty.growthMultiplier || 1);
          ballSpeed = baseBallSpeed;
          buildLevel();
          resetBallPosition();
          paddle.position.x = 0;
          paddleState.targetX = 0;
          paddleState.velocity = 0;
          clampPaddlePosition();
          resetAbilityState();
          updateAbilityUI();
          gameState='playing';
          updateHUD();
          document.getElementById('message').style.display='none';
          resumeMusic();
        }

        // Achievements helper
        function checkAchievements(){
          if(score >= 100 && !achievements['Score 100']){ achievements['Score 100'] = true; showMessage('Achievement: 100 points!', 2000); }
          if(level >= 3 && !achievements['Level 3']){ achievements['Level 3'] = true; showMessage('Achievement: level 3 reached!', 2000); }
          if(comboMultiplier() >= 3 && !achievements['Combo x3']){ achievements['Combo x3'] = true; showMessage('Achievement: combo x3!', 2000); }
          if(totalBlocksDestroyed >= 50 && !achievements['50 bricks']){ achievements['50 bricks'] = true; showMessage('Achievement: 50 bricks destroyed!', 2000); }
          if(quest && quest.completed && !achievements['Quest']){ achievements['Quest'] = true; showMessage('Achievement: quest completed!', 2000); }
          updateHUD();
        }

        function destroyBlockAtIndex(index, options){
          if(index < 0 || index >= blocks.length) return null;
          options = options || {};
          var block = blocks[index];
          var hitPosition = block.position.clone();
          brickGroup.remove(block);
          blocks.splice(index, 1);
          if(options.playSound !== false) playSfx('block');
          boostCombo();
          var gainedBase = Math.floor(12 * comboMultiplier());
          var scoreMultiplier = options.scoreMultiplier !== undefined ? options.scoreMultiplier : 1;
          var gained = Math.max(4, Math.floor(gainedBase * scoreMultiplier));
          score += gained;
          totalBlocksDestroyed++;
          if(quest && !quest.completed) quest.progress++;
          if(score > bestScore) saveBestScore(score);
          updateHUD();
          tryCompleteQuest();
          checkAchievements();
          var fireTriggered = !!(abilityState.fireballActive && options.fireBurst && !options.disableFireChain);
          spawnBrickBurst(hitPosition, fireTriggered);
          startBlockFade(block, fireTriggered);
          if(fireTriggered){
            spawnWizzEffect(hitPosition, abilityState.fireballRadius || 2.5, true);
          }

          if(fireTriggered && options.allowIgnite !== false){
            igniteNearbyBlocks(hitPosition, abilityState.fireballRadius || 2.8);
          }

          if(blocks.length === 0 && options.skipLevelCheck !== true){
            handleLevelCleared();
          }

          return hitPosition;
        }

        function igniteNearbyBlocks(center, radius){
          if(!abilityState.fireballActive) return;
          radius = radius || 2.8;
          var radiusSq = radius * radius;
          var candidates = [];
          for(var idx = 0; idx < blocks.length; idx++){
            var candidate = blocks[idx];
            var distSq = candidate.position.distanceToSquared(center);
            if(distSq <= radiusSq){
              candidates.push({ block: candidate, dist: distSq });
            }
          }
          candidates.sort(function(a, b){ return a.dist - b.dist; });
          var destroyed = 0;
          for(var i=0;i<candidates.length && destroyed < 3;i++){
            var entry = candidates[i];
            var index = blocks.indexOf(entry.block);
            if(index !== -1){
              destroyBlockAtIndex(index, { allowIgnite: false, playSound: false, scoreMultiplier: 0.75, skipLevelCheck: true, fireBurst: true, disableFireChain: true });
              destroyed++;
            }
          }
          if(destroyed && blocks.length === 0){
            handleLevelCleared();
          }
        }

        function handleLevelCleared(){
          if(gameState === 'scoreboard') return;
          var difficulty = getSelectedDifficulty();
          var completedLevel = level;
          level++;
          gameState = 'scoreboard';
          resetCombo();
          while(powerUps.length){ var dropped = powerUps.pop(); scene.remove(dropped); }
          updateHUD();
          openScoreboard('Level ' + completedLevel + ' cleared!', { mode: 'summary', onContinue: function(){ prepareNextLevel(difficulty); } });
        }

        function prepareNextLevel(difficulty){
          buildLevel();
          var baseSeed = defaultBaseBallSpeed * (difficulty.speedMultiplier || 1);
          var levelsCompleted = Math.max(0, level - (difficulty.startLevel || 1));
          baseBallSpeed = Math.min(baseSeed + levelsCompleted * ballSpeedGrowth, maxBallSpeed * 0.85);
          ballSpeed = baseBallSpeed;
          resetBallPosition();
          updateHUD();
          var themeLabel = currentTheme ? currentTheme.name : 'Level';
          showMessage('Level ' + level + ' - ' + themeLabel, 1800);
          playSfx('levelUp');
          gameState = 'playing';
        }

        function startBlockFade(mesh, fireMode){
          if(!mesh) return;
          var fadeMaterial = mesh.material;
          if(fadeMaterial && !fadeMaterial.transparent){
            mesh.material = fadeMaterial.clone();
            mesh.material.transparent = true;
          }
          if(mesh.material){
            mesh.material.opacity = 1;
          }
          mesh.scale.set(1,1,1);
          scene.add(mesh);
          fadingBlocks.push({ mesh: mesh, life: fireMode ? 0.45 : 0.35, age: 0 });
        }

        function spawnWizzEffect(position, radius, fireMode){
          radius = radius || 2.4;
          var count = fireMode ? 80 : 48;
          var geometry = new THREE.BufferGeometry();
          var positions = new Float32Array(count * 3);
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          var material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: fireMode ? 0.48 : 0.36,
            sizeAttenuation: true,
            map: getParticleTexture(fireMode ? '#ff9b6a' : '#7dd3fc'),
            transparent: true,
            opacity: 0.92,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            alphaTest: 0.01
          });
          var points = new THREE.Points(geometry, material);
          points.position.copy(position);
          points.frustumCulled = false;
          var angles = new Array(count);
          for(var i=0;i<count;i++){
            var angle = (i / count) * Math.PI * 2;
            angles[i] = angle;
            var x = Math.cos(angle) * radius;
            var z = Math.sin(angle) * radius;
            var y = Math.sin(angle * 2.2) * (fireMode ? 0.8 : 0.4);
            positions[i*3] = x;
            positions[i*3 + 1] = y;
            positions[i*3 + 2] = z;
          }
          geometry.attributes.position.needsUpdate = true;
          scene.add(points);
          wizzEffects.push({
            points: points,
            angles: angles,
            radius: radius,
            wave: fireMode ? 0.8 : 0.4,
            spin: fireMode ? 6.5 : 4.2,
            life: fireMode ? 0.55 : 0.45,
            age: 0,
            count: count
          });
        }

        function spawnBrickBurst(position, fireMode){
          if(!position) return;
          var count = fireMode ? 72 : 42;
          var positions = new Float32Array(count * 3);
          var velocities = new Float32Array(count * 3);
          for(var i=0;i<count;i++){
            var theta = Math.random() * Math.PI * 2;
            var speed = fireMode ? 14 + Math.random() * 10 : 10 + Math.random() * 6;
            var uplift = fireMode ? 6 + Math.random() * 4 : 3 + Math.random() * 2;
            velocities[i*3] = Math.cos(theta) * speed;
            velocities[i*3 + 1] = uplift;
            velocities[i*3 + 2] = Math.sin(theta) * speed * 0.6;
            positions[i*3] = 0;
            positions[i*3 + 1] = 0;
            positions[i*3 + 2] = 0;
          }
          var geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          var material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: fireMode ? 0.42 : 0.32,
            sizeAttenuation: true,
            map: getParticleTexture(fireMode ? '#ff924d' : '#8fd6ff'),
            transparent: true,
            opacity: fireMode ? 0.95 : 0.82,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            alphaTest: 0.01
          });
          var points = new THREE.Points(geometry, material);
          points.position.copy(position);
          points.frustumCulled = false;
          scene.add(points);
          brickBursts.push({
            points: points,
            positions: positions,
            velocities: velocities,
            life: fireMode ? 0.55 : 0.4,
            age: 0,
            fire: fireMode
          });
          if(fireMode){
            var burstRadius = abilityState.fireballRadius || 2.6;
            spawnWizzEffect(position, burstRadius, true);
          }
        }

        // Collision + game logic updates
        function checkForCollisions(){
          if(gameState!=='playing') return;

          // Walls
          if (ball.position.x < -playfieldHalfWidth || ball.position.x > playfieldHalfWidth){
            ballDirection.x *= -1;
            ball.position.x = THREE.Math.clamp(ball.position.x, -playfieldHalfWidth, playfieldHalfWidth);
            stabiliseBallDirection();
          }

          if(abilityState.iceWallActive && ballDirection.y < 0 && ball.position.y <= iceWallY + 0.6){
            ballDirection.y = Math.abs(ballDirection.y);
            ball.position.y = iceWallY + 0.65;
            stabiliseBallDirection(0.28);
            playSfx('powerup');
          }

          if (ball.position.y < -13) {
            lives--;
            playSfx('lifeLost');
            saveBestScore(score);
            resetCombo();
            updateHUD();
            if(lives<=0){
              playSfx('gameOver');
              enterMenuState('Game Over - score ' + score);
              return;
            }
            resetBallPosition();
          }

          if (ball.position.y > 15){
            ballDirection.y *= -1;
            ball.position.y = 15;
            stabiliseBallDirection();
          }

          // Paddle collision
          var paddleHalfWidth = paddleState.hitRadius;
          var paddleHeight = 1.2;
          if (ball.position.y <= paddle.position.y + paddleHeight && ball.position.y >= paddle.position.y - paddleHeight) {
            if (ball.position.x > paddle.position.x - paddleHalfWidth && ball.position.x < paddle.position.x + paddleHalfWidth) {
              var relative = (ball.position.x - paddle.position.x) / paddleHalfWidth;
              relative = THREE.Math.clamp(relative, -1, 1);
              var bounceAngle = relative * THREE.Math.degToRad(70);
              var newDir = new THREE.Vector3(Math.sin(bounceAngle), Math.cos(bounceAngle), 0);
              if(newDir.y <= 0) newDir.y = Math.abs(newDir.y) || 0.5;
              ballDirection.copy(newDir.normalize());
              ball.position.y = paddle.position.y + paddleHeight + 0.1;
              accelerateBall(1 + (Math.abs(relative) * 0.12));
              playSfx('paddle');
              stabiliseBallDirection(0.32);
            }
          }

          // Blocks collision (simple distance test)
          for (var i = 0; i < blocks.length; i++) {
            var block = blocks[i];
            if (block.position.distanceTo(ball.position) < 1.2) {
              var diffX = Math.abs(ball.position.x - block.position.x);
              var diffY = Math.abs(ball.position.y - block.position.y);
              var unstoppable = abilityState.fireballActive;
              if(!unstoppable){
                if(diffX > diffY){
                  ballDirection.x *= -1;
                } else {
                  ballDirection.y *= -1;
                }
                stabiliseBallDirection();
                accelerateBall(1.02);
              } else {
                accelerateBall(1.01);
              }
              destroyBlockAtIndex(i, { allowIgnite: true, fireBurst: abilityState.fireballActive });
              i--;
            }
          }

          // Power-ups falling
          for(var p=0;p<powerUps.length;p++){
            var up = powerUps[p];
            up.position.y -= 0.05;
            up.rotation.y += 0.03;
            if(up.userData && up.userData.halo){
              var halo = up.userData.halo;
              halo.material.opacity = 0.18 + 0.07 * Math.sin(Date.now()*0.002 + p);
            }
            var collectedByBall = up.position.distanceTo(ball.position) < 1.2;
            var collectedByPaddle = false;
            if(!collectedByBall){
              var dx = Math.abs(up.position.x - paddle.position.x);
              var dy = Math.abs(up.position.y - paddle.position.y);
              if(dx <= paddleState.hitRadius + 1 && dy <= 2.2){
                collectedByPaddle = true;
              }
            }
            if(collectedByBall || collectedByPaddle){
              if(up.userData.type==='expand'){
                paddle.scale.x = 2;
                updatePaddleHitRadius();
                setTimeout(()=>{ paddle.scale.x = 1; updatePaddleHitRadius(); }, 8000);
              showMessage('Power-up: Paddle expanded', 1500);
              playSfx('powerup');
            } else if(up.userData.type==='life'){
                lives++; updateHUD(); showMessage('Power-up: Extra life', 1200);
                playSfx('powerup');
              } else if(up.userData.type==='score'){
                score += 100;
                saveBestScore(score);
                updateHUD();
                showMessage('Power-up: +100 points', 1200);
                playSfx('powerup');
              }
              scene.remove(up);
              powerUps.splice(p,1); p--;
            }
          }
        }

        function lightMouvement(){
          light.position.x = ball.position.x;
          light.position.y = ball.position.y;
        }

        function updateCameraPosition(){
          var focusY = THREE.Math.clamp(ball.position.y * 0.25, -2, 4);
          var focusX = THREE.Math.clamp(ball.position.x * 0.12, -2.8, 2.8);
          var desiredLook = tempVec1.set(focusX, focusY, 0);

          cameraTarget.lerp(desiredLook, 0.04);

          var desiredCameraPos = tempVec2.set(
            cameraBasePosition.x + cameraTarget.x * 0.08,
            cameraBasePosition.y + cameraTarget.y * 0.12,
            cameraBasePosition.z
          );
          camera.position.lerp(desiredCameraPos, 0.04);
          camera.lookAt(cameraTarget);
        }

        // Resize
        window.addEventListener('resize', function(){
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Main loop
        function update(){
          requestAnimationFrame(update);
          var delta = clock.getDelta();
          if(backgroundSphere.visible) backgroundUniforms.time.value += delta;
          animateThemeModel(delta);
          if(gameState==='playing'){
            var stepSpeed = ballSpeed;
            if(abilityState.slowTimeActive) stepSpeed *= abilityState.slowFactor || 0.5;
            ball.position.add(ballDirection.clone().multiplyScalar(stepSpeed));
            checkForCollisions();
            lightMouvement();
            updateCameraPosition();
          }
          updatePaddleMotion();
          updateMagicState();
          updateParticleSystems(delta);
          renderer.render(scene, camera);
        }

        function updatePaddleMotion(){
          var limit = playfieldHalfWidth - paddleState.hitRadius;
          paddleState.targetX = THREE.Math.clamp(paddleState.targetX, -limit, limit);
          paddleState.mouseTargetX = THREE.Math.clamp(paddleState.mouseTargetX, -limit, limit);

          var accel = 0;
          if(keyState.left && !keyState.right) accel -= 2.0;
          if(keyState.right && !keyState.left) accel += 2.0;

          paddleState.velocity += accel * 0.14;
          paddleState.velocity *= 0.84;
          if(paddleState.mouseControlActive && !(keyState.left || keyState.right)){
            paddleState.velocity += (paddleState.mouseTargetX - paddle.position.x) * paddleState.smoothFactor;
          }
          if(Math.abs(paddleState.velocity) < 0.01) paddleState.velocity = 0;
          paddleState.velocity = THREE.Math.clamp(paddleState.velocity, -paddleState.speedCap, paddleState.speedCap);
          paddle.position.x += paddleState.velocity;
          clampPaddlePosition();
          if(!(keyState.left || keyState.right)){
            paddleState.targetX = paddleState.mouseControlActive ? paddleState.mouseTargetX : paddle.position.x;
          }
        }

        function updateMagicState(){
          if(!selectedPaddleProfile){
            abilityStatusEl.textContent = '—';
            return;
          }
          var now = performance.now();
          if(abilityState.fireballActive && now >= abilityState.fireballEnd){
            abilityState.fireballActive = false;
            restoreBallAppearance();
          }
          if(abilityState.slowTimeActive && now >= abilityState.slowEnd){
            abilityState.slowTimeActive = false;
            if(slowParticles) slowParticles.visible = false;
          }
          if(abilityState.iceWallActive && now >= abilityState.iceWallEnd){
            deactivateIceWall();
          }
          if(!abilityReady && now >= abilityCooldownEnd && !isAbilityActive()){ abilityReady = true; }
          updateAbilityUI();
        }

        function updateAbilityUI(){
          if(!selectedPaddleProfile){
            abilityStatusEl.textContent = '—';
            return;
          }
          var now = performance.now();
          var ability = selectedPaddleProfile.ability;
          if(isAbilityActive()){
            abilityStatusEl.textContent = ability.name + ' active';
          } else {
            var remaining = Math.max(0, abilityCooldownEnd - now);
            if(remaining <= 0){
              abilityStatusEl.textContent = ability.name + ' ready (press F)';
            } else {
              abilityStatusEl.textContent = 'Cooling down ' + (remaining/1000).toFixed(1) + 's';
            }
          }
        }

        function isAbilityActive(){
          var now = performance.now();
          return abilityState.fireballActive || abilityState.slowTimeActive || (abilityState.iceWallActive && abilityState.iceWallEnd > now);
        }

        function activateMagicPower(){
          if(!selectedPaddleProfile || gameState !== 'playing') return;
          var now = performance.now();
          if(!abilityReady || now < abilityCooldownEnd) return;
          var ability = selectedPaddleProfile.ability;
          abilityReady = false;
          abilityCooldownEnd = now + (ability.cooldown || 15000);
          abilityActiveUntil = now + (ability.duration || 4000);
          if(ability.type === 'fireball'){
            activateFireballAbility(ability);
          } else if(ability.type === 'iceWall'){
            activateIceWallAbility();
          } else if(ability.type === 'slow'){
            activateSlowAbility(ability.factor || 0.5);
          }
          showMessage('Ability: ' + ability.name, 1400);
          updateAbilityUI();
          magicKeyPressed = false;
        }

        function applyFireballVisual(){
          ballMaterial.color.setHex(0xff6b2c);
          ballMaterial.emissive.setHex(0xff3d00);
          ballMaterial.emissiveIntensity = Math.max(ballMaterial.emissiveIntensity, 1.4);
          if(ballGlow && ballGlow.material){
            ballGlow.material.color.setHex(0xffa94d);
            ballGlow.material.opacity = Math.max(0.45, ballGlow.material.opacity);
          }
          if(ballLight){
            ballLight.color.setHex(0xff7b1a);
            ballLight.intensity = Math.max(ballLight.intensity, 1.9);
          }
        }

        function restoreBallAppearance(){
          ballMaterial.color.copy(ballBaseColor);
          ballMaterial.emissive.copy(ballBaseEmissive);
          ballMaterial.emissiveIntensity = ballBaseEmissiveIntensity;
          if(ballGlow && ballGlow.material){
            ballGlow.material.color.copy(ballGlowBaseColor);
            ballGlow.material.opacity = ballGlowBaseOpacity;
          }
          if(ballLight){
            ballLight.color.copy(ballLightBaseColor);
            ballLight.intensity = ballLightBaseIntensity;
          }
          if(fireParticles){ fireParticles.visible = false; }
        }

        function activateFireballAbility(ability){
          abilityState.fireballActive = true;
          abilityState.fireballEnd = abilityActiveUntil;
          abilityState.fireballRadius = ability.radius || 2.6;
          ensureFireParticles();
          if(fireParticles){
            for(var i=0;i<fireParticleData.length;i++){
              var d = fireParticleData[i];
              d.angle = Math.random() * Math.PI * 2;
              d.radius = 0.65 + Math.random() * 0.45;
              fireParticlePositions[i*3] = Math.cos(d.angle) * d.radius;
              fireParticlePositions[i*3 + 1] = Math.sin(d.angle) * d.radius;
              fireParticlePositions[i*3 + 2] = 0;
            }
            fireParticles.geometry.attributes.position.needsUpdate = true;
            fireParticles.visible = true;
          }
          applyFireballVisual();
          playSfx('magicFire');
        }

        function ensureIceWallMesh(){
          if(abilityState.iceWallMesh) return abilityState.iceWallMesh;
          var geometry = new THREE.BoxGeometry(55, 0.6, 0.8);
          var material = new THREE.MeshPhongMaterial({
            color: 0x7dd3fc,
            transparent: true,
            opacity: 0.55,
            emissive: 0x38bdf8,
            emissiveIntensity: 0.35
          });
          var wall = new THREE.Mesh(geometry, material);
          wall.position.set(0, iceWallY, 0);
          wall.visible = false;
          scene.add(wall);
          abilityState.iceWallMesh = wall;
          return wall;
        }

        function activateIceWallAbility(){
          var wall = ensureIceWallMesh();
          wall.visible = true;
          wall.scale.set(1,1,1);
          abilityState.iceWallActive = true;
          abilityState.iceWallEnd = abilityActiveUntil;
          ensureIceParticles();
          if(iceParticles) iceParticles.visible = true;
          playSfx('magicIce');
        }

        function deactivateIceWall(){
          abilityState.iceWallActive = false;
          abilityState.iceWallEnd = 0;
          if(abilityState.iceWallMesh){ abilityState.iceWallMesh.visible = false; }
          if(iceParticles){ iceParticles.visible = false; }
        }

        function activateSlowAbility(factor){
          abilityState.slowTimeActive = true;
          abilityState.slowEnd = abilityActiveUntil;
          abilityState.slowFactor = THREE.Math.clamp(factor || 0.5, 0.2, 0.8);
          ensureSlowParticles();
          if(slowParticles && slowParticleData){
            for(var i=0;i<slowParticleData.count;i++){
              var phase = Math.random() * Math.PI * 2;
              var radius = 0.9 + Math.random() * 0.35;
              slowParticleData.phases[i] = phase;
              slowParticleData.radius[i] = radius;
              slowParticleData.speed[i] = 1 + Math.random() * 1.2;
              slowParticleData.positions[i*3] = Math.cos(phase) * radius;
              slowParticleData.positions[i*3 + 1] = Math.sin(phase) * (radius * 0.6);
              slowParticleData.positions[i*3 + 2] = 0;
            }
            slowParticleData.geometry.attributes.position.needsUpdate = true;
            slowParticles.visible = true;
          }
          playSfx('magicSlow');
        }

        function ensureSlowParticles(){
          if(slowParticles) return slowParticles;
          var count = 48;
          var positions = new Float32Array(count * 3);
          var geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          var material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.42,
            sizeAttenuation: true,
            map: getParticleTexture('#c4b5fd'),
            transparent: true,
            opacity: 0.82,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            alphaTest: 0.01
          });
          slowParticles = new THREE.Points(geometry, material);
          slowParticles.frustumCulled = false;
          slowParticles.visible = false;
          slowParticleData = {
            geometry: geometry,
            positions: positions,
            phases: new Array(count),
            speed: new Array(count),
            radius: new Array(count),
            count: count
          };
          for(var i=0;i<count;i++){
            var phase = Math.random() * Math.PI * 2;
            var radius = 0.9 + Math.random() * 0.35;
            slowParticleData.phases[i] = phase;
            slowParticleData.speed[i] = 1 + Math.random() * 1.2;
            slowParticleData.radius[i] = radius;
            positions[i*3] = Math.cos(phase) * radius;
            positions[i*3 + 1] = Math.sin(phase) * (radius * 0.6);
            positions[i*3 + 2] = 0;
          }
          geometry.attributes.position.needsUpdate = true;
          ball.add(slowParticles);
          return slowParticles;
        }

        function ensureFireParticles(){
          if(fireParticles) return fireParticles;
          var count = 42;
          fireParticlePositions = new Float32Array(count * 3);
          var geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(fireParticlePositions, 3));
          var material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.55,
            sizeAttenuation: true,
            map: getParticleTexture('#ff8a42'),
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            alphaTest: 0.01
          });
          fireParticles = new THREE.Points(geometry, material);
          fireParticles.frustumCulled = false;
          fireParticles.visible = false;
          fireParticleData = [];
          for(var i=0;i<count;i++){
            var radius = 0.65 + Math.random() * 0.45;
            var angle = Math.random() * Math.PI * 2;
            fireParticleData.push({ radius: radius, angle: angle, speed: 1.6 + Math.random()*1.4, wobble: 0.35 + Math.random()*0.4 });
            fireParticlePositions[i*3] = Math.cos(angle) * radius;
            fireParticlePositions[i*3 + 1] = Math.sin(angle) * radius;
            fireParticlePositions[i*3 + 2] = 0;
          }
          geometry.attributes.position.needsUpdate = true;
          ball.add(fireParticles);
          return fireParticles;
        }

        function ensureIceParticles(){
          if(iceParticles) return iceParticles;
          var count = 80;
          iceParticlePositions = new Float32Array(count * 3);
          var geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(iceParticlePositions, 3));
          var material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.58,
            sizeAttenuation: true,
            map: getParticleTexture('#9fd8ff'),
            transparent: true,
            opacity: 0.78,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            alphaTest: 0.01
          });
          iceParticles = new THREE.Points(geometry, material);
          iceParticles.frustumCulled = false;
          iceParticles.visible = false;
          iceParticleData = [];
          for(var i=0;i<count;i++){
            var offsetX = (Math.random() - 0.5) * 50;
            var offsetZ = (Math.random() - 0.5) * 1.4;
            var heightOffset = Math.random() * 1.2;
            iceParticleData.push({ baseX: offsetX, baseZ: offsetZ, height: heightOffset, phase: Math.random()*Math.PI*2, speed: 1 + Math.random()*1.4, amplitude: 0.4 + Math.random()*0.3 });
            iceParticlePositions[i*3] = offsetX;
            iceParticlePositions[i*3 + 1] = iceWallY + 0.4 + heightOffset;
            iceParticlePositions[i*3 + 2] = offsetZ;
          }
          geometry.attributes.position.needsUpdate = true;
          scene.add(iceParticles);
          return iceParticles;
        }

        function updateParticleSystems(delta){
          var time = performance.now() * 0.0015;
          if(fireParticles && fireParticles.visible){
            var pos = fireParticles.geometry.attributes.position;
            for(var i=0;i<fireParticleData.length;i++){
              var data = fireParticleData[i];
              data.angle += data.speed * delta;
              var wobble = Math.sin(time * 0.9 + data.angle * 2.2) * data.wobble;
              var x = Math.cos(data.angle) * data.radius;
              var y = Math.sin(data.angle) * (data.radius * 0.85) + wobble * 0.3;
              var z = wobble * 0.45;
              pos.setXYZ(i, x, y, z);
            }
            pos.needsUpdate = true;
          }
          if(iceParticles && iceParticles.visible){
            var icePos = iceParticles.geometry.attributes.position;
            var t = performance.now()*0.001;
            for(var j=0;j<iceParticleData.length;j++){
              var info = iceParticleData[j];
              var angle = t * info.speed + info.phase;
              var x = info.baseX + Math.sin(angle) * 0.65;
              var y = iceWallY + 0.4 + Math.abs(Math.cos(angle * 1.7)) * info.amplitude + info.height;
              var z = info.baseZ + Math.sin(angle * 1.5) * 0.45;
              icePos.setXYZ(j, x, y, z);
            }
            icePos.needsUpdate = true;
          }
          if(slowParticles && slowParticles.visible && slowParticleData){
            var slowPos = slowParticles.geometry.attributes.position;
            var count = slowParticleData.count;
            var t2 = performance.now()*0.0012;
            for(var k=0;k<count;k++){
              var phi = slowParticleData.phases[k] + slowParticleData.speed[k] * delta;
              slowParticleData.phases[k] = phi;
              var r = slowParticleData.radius[k];
              var x = Math.cos(phi) * r;
              var y = Math.sin(phi) * (r * 0.6);
              var z = Math.sin(t2 + phi * 2.6) * 0.38;
              slowPos.setXYZ(k, x, y, z);
            }
            slowPos.needsUpdate = true;
          }
          if(wizzEffects.length){
            for(var w=wizzEffects.length-1; w>=0; w--){
              var effect = wizzEffects[w];
              effect.age += delta;
              var ring = effect.points.geometry.attributes.position;
              var spin = effect.spin * delta;
              for(var i=0;i<effect.count;i++){
                var angle = effect.angles[i] + spin;
                effect.angles[i] = angle;
                var radius = effect.radius * (1 + Math.sin(effect.age * 6 + i * 0.08) * 0.05);
                var x = Math.cos(angle) * radius;
                var z = Math.sin(angle) * radius;
                var y = Math.sin(angle * 2.1 + effect.age * 5) * effect.wave;
                ring.setXYZ(i, x, y, z);
              }
              ring.needsUpdate = true;
              var fade = 1 - (effect.age / effect.life);
              effect.points.material.opacity = Math.max(0, fade * 0.95);
              if(effect.age >= effect.life){
                scene.remove(effect.points);
                effect.points.geometry.dispose();
                effect.points.material.dispose();
                wizzEffects.splice(w,1);
              }
            }
          }
          if(fadingBlocks.length){
            for(var f=fadingBlocks.length-1; f>=0; f--){
              var entry = fadingBlocks[f];
              entry.age += delta;
              var tFade = 1 - (entry.age / entry.life);
              if(entry.mesh.material){
                entry.mesh.material.opacity = Math.max(0, tFade);
                entry.mesh.material.needsUpdate = true;
              }
              entry.mesh.scale.setScalar(1 + (1 - tFade) * 0.25);
              if(entry.age >= entry.life){
                scene.remove(entry.mesh);
                if(entry.mesh.material && entry.mesh.material.dispose){ entry.mesh.material.dispose(); }
                fadingBlocks.splice(f,1);
              }
            }
          }
          if(brickBursts.length){
            for(var b = brickBursts.length - 1; b >= 0; b--){
              var burst = brickBursts[b];
              burst.age += delta;
              var attr = burst.points.geometry.attributes.position;
              for(var p=0;p<burst.positions.length/3;p++){
                var vxIndex = p*3;
                burst.velocities[vxIndex + 1] -= (burst.fire ? 18 : 12) * delta;
                burst.velocities[vxIndex] *= 0.93;
                burst.velocities[vxIndex + 2] *= 0.93;
                burst.positions[vxIndex] += burst.velocities[vxIndex] * delta * 0.05;
                burst.positions[vxIndex + 1] += burst.velocities[vxIndex + 1] * delta * 0.05;
                burst.positions[vxIndex + 2] += burst.velocities[vxIndex + 2] * delta * 0.05;
                attr.setXYZ(p, burst.positions[vxIndex], burst.positions[vxIndex + 1], burst.positions[vxIndex + 2]);
              }
              attr.needsUpdate = true;
              var fadeBurst = 1 - (burst.age / burst.life);
              burst.points.material.opacity = Math.max(0, fadeBurst * (burst.fire ? 1 : 0.78));
              if(burst.age >= burst.life){
                scene.remove(burst.points);
                burst.points.geometry.dispose();
                burst.points.material.dispose();
                brickBursts.splice(b, 1);
              }
            }
          }
        }

        // Start in menu
        enterMenuState();

        // initial I/O
        function checkForIOInteraction(){
          // legacy hook kept for compatibility - no logic here
        }
        checkForIOInteraction();

        function unlockAudioOnInteraction(){
          if(!audioState.enabled) return;
          ensureAudioReady(true);
          resumeMusic();
        }

        ['pointerdown','touchstart','keydown'].forEach(function(evt){
          window.addEventListener(evt, unlockAudioOnInteraction, { once: true });
        });

        update();
