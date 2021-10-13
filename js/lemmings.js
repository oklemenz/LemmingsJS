var Lemmings;
(function (Lemmings) {
    /** loads the config and provides an game-resources object */
    class GameFactory {
        constructor(rootPath) {
            this.rootPath = rootPath;
            this.fileProvider = new Lemmings.FileProvider(rootPath);
            let configFileReader = this.fileProvider.loadString("config.json");
            this.configReader = new Lemmings.ConfigReader(configFileReader);
        }
        /** return a game object to controle/run the game */
        getGame(gameType) {
            return new Promise((resolve, reject) => {
                /// load resources
                this.getGameResources(gameType)
                    .then(res => resolve(new Lemmings.Game(res)));
            });
        }
        /** return the config of a game type */
        getConfig(gameType) {
            return this.configReader.getConfig(gameType);
        }
        /** return a Game Resources that gaves access to images, maps, sounds  */
        getGameResources(gameType) {
            return new Promise((resolve, reject) => {
                this.configReader.getConfig(gameType).then(config => {
                    if (config == null) {
                        reject();
                        return;
                    }
                    resolve(new Lemmings.GameResources(this.fileProvider, config));
                });
            });
        }
    }
    Lemmings.GameFactory = GameFactory;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** reprecent access to the resources of a Lemmings Game */
    class GameResources {
        constructor(fileProvider, config) {
            this.fileProvider = fileProvider;
            this.config = config;
            this.mainDat = null;
        }
        /** free resources */
        dispose() {
            this.stopMusic();
            this.stopSound();
            this.soundImage = null;
        }
        /** return the main.dat file container */
        getMainDat() {
            if (this.mainDat != null)
                return this.mainDat;
            this.mainDat = new Promise((resolve, reject) => {
                this.fileProvider.loadBinary(this.config.path, "MAIN.DAT")
                    .then(data => {
                    /// split the file in it's parts
                    let mainParts = new Lemmings.FileContainer(data);
                    resolve(mainParts);
                });
            });
            return this.mainDat;
        }
        /** return the Lemmings animations */
        getLemmingsSprite(colorPalette) {
            return new Promise((resolve, reject) => {
                this.getMainDat().then(container => {
                    let sprite = new Lemmings.LemmingsSprite(container.getPart(0), colorPalette);
                    resolve(sprite);
                });
            });
        }
        getSkillPanelSprite(colorPalette) {
            return new Promise((resolve, reject) => {
                this.getMainDat().then(container => {
                    resolve(new Lemmings.SkillPanelSprites(container.getPart(2), container.getPart(6), colorPalette));
                });
            });
        }
        getMasks() {
            return new Promise((resolve, reject) => {
                this.getMainDat().then(container => {
                    resolve(new Lemmings.MaskProvider(container.getPart(1)));
                });
            });
        }
        /** return the Level Data for a given Level-Index */
        getLevel(levelMode, levelIndex) {
            let levelReader = new Lemmings.LevelLoader(this.fileProvider, this.config);
            return levelReader.getLevel(levelMode, levelIndex);
        }
        /** return the level group names for this game */
        getLevelGroups() {
            return this.config.level.groups;
        }
        initSoundImage() {
            if (this.soundImage)
                return this.soundImage;
            this.soundImage = new Promise((resolve, reject) => {
                /// load the adlib file
                this.fileProvider.loadBinary(this.config.path, "ADLIB.DAT")
                    .then((data) => {
                    /// unpack the file
                    var container = new Lemmings.FileContainer(data);
                    /// create Sound Image
                    var soundImage = new Lemmings.SoundImageManager(container.getPart(0), this.config.audioConfig);
                    resolve(soundImage);
                });
            });
            return this.soundImage;
        }
        /** stop playback of the music song */
        stopMusic() {
            if (this.musicPlayer != null) {
                this.musicPlayer.stop();
                this.musicPlayer = null;
            }
        }
        /** return a palyer to playback a music song */
        getMusicPlayer(songIndex) {
            this.stopMusic();
            return new Promise((resolve, reject) => {
                this.initSoundImage().then(soundImage => {
                    /// get track
                    var adlibSrc = soundImage.getMusicTrack(songIndex);
                    /// play
                    this.musicPlayer = new Lemmings.AudioPlayer(adlibSrc, Lemmings.OplEmulatorType.Dosbox);
                    /// return
                    resolve(this.musicPlayer);
                });
            });
        }
        /** stop playback of the music song */
        stopSound() {
            if (this.soundPlayer != null) {
                this.soundPlayer.stop();
                this.soundPlayer = null;
            }
        }
        /** return a palyer to playback a sound effect */
        getSoundPlayer(sondIndex) {
            this.stopSound();
            return new Promise((resolve, reject) => {
                this.initSoundImage().then(soundImage => {
                    /// get track
                    var adlibSrc = soundImage.getSoundTrack(sondIndex);
                    /// play
                    this.soundPlayer = new Lemmings.AudioPlayer(adlibSrc, Lemmings.OplEmulatorType.Dosbox);
                    /// return
                    resolve(this.soundPlayer);
                });
            });
        }
    }
    Lemmings.GameResources = GameResources;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** collects all information about the finished game */
    class GameResult {
        constructor(game) {
            this.state = game.getGameState();
            this.replay = game.getCommandManager().serialize();
            this.survivorPercentage = game.getVictoryCondition().getSurvivorPercentage();
            this.survivors = game.getVictoryCondition().getSurvivorsCount();
            this.duration = game.getGameTimer().getGameTicks();
        }
    }
    Lemmings.GameResult = GameResult;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    var GameStateTypes;
    (function (GameStateTypes) {
        GameStateTypes[GameStateTypes["UNKNOWN"] = 0] = "UNKNOWN";
        GameStateTypes[GameStateTypes["RUNNING"] = 1] = "RUNNING";
        GameStateTypes[GameStateTypes["FAILED_OUT_OF_TIME"] = 2] = "FAILED_OUT_OF_TIME";
        GameStateTypes[GameStateTypes["FAILED_LESS_LEMMINGS"] = 3] = "FAILED_LESS_LEMMINGS";
        GameStateTypes[GameStateTypes["SUCCEEDED"] = 4] = "SUCCEEDED";
    })(GameStateTypes = Lemmings.GameStateTypes || (Lemmings.GameStateTypes = {}));
    ;
    (function (GameStateTypes) {
        function toString(type) {
            return GameStateTypes[type];
        }
        GameStateTypes.toString = toString;
        function length() {
            return 5;
        }
        GameStateTypes.length = length;
        function isValid(type) {
            return ((type > GameStateTypes.UNKNOWN) && (type < this.lenght()));
        }
        GameStateTypes.isValid = isValid;
        /** return the GameStateTypes with the given name */
        function fromString(typeName) {
            typeName = typeName.trim().toUpperCase();
            for (let i = 0; i < this.length(); i++) {
                if (GameStateTypes[i] == typeName)
                    return i;
            }
            return GameStateTypes.UNKNOWN;
        }
        GameStateTypes.fromString = fromString;
    })(GameStateTypes = Lemmings.GameStateTypes || (Lemmings.GameStateTypes = {}));
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    var GameTypes;
    (function (GameTypes) {
        GameTypes[GameTypes["UNKNOWN"] = 0] = "UNKNOWN";
        GameTypes[GameTypes["LEMMINGS"] = 1] = "LEMMINGS";
        GameTypes[GameTypes["OHNO"] = 2] = "OHNO";
        /*GameTypes[GameTypes["XMAS91"] = 3] = "XMAS91";
        GameTypes[GameTypes["XMAS92"] = 4] = "XMAS92";
        GameTypes[GameTypes["HOLIDAY93"] = 5] = "HOLIDAY93";
        GameTypes[GameTypes["HOLIDAY94"] = 6] = "HOLIDAY94";*/
    })(GameTypes = Lemmings.GameTypes || (Lemmings.GameTypes = {}));
    ;
    (function (GameTypes) {
        function toString(type) {
            return GameTypes[type];
        }
        GameTypes.toString = toString;
        function length() {
            return 7;
        }
        GameTypes.length = length;
        function isValid(type) {
            return ((type > GameTypes.UNKNOWN) && (type < this.lenght()));
        }
        GameTypes.isValid = isValid;
        /** return the GameTypes with the given name */
        function fromString(typeName) {
            typeName = typeName.trim().toUpperCase();
            for (let i = 0; i < this.length(); i++) {
                if (GameTypes[i] == typeName)
                    return i;
            }
            return GameTypes.UNKNOWN;
        }
        GameTypes.fromString = fromString;
    })(GameTypes = Lemmings.GameTypes || (Lemmings.GameTypes = {}));
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** provides an game object to controle the game */
    class Game {
        constructor(gameResources) {
            this.log = new Lemmings.LogHandler("Game");
            this.gameResources = null;
            this.guiDispaly = null;
            this.dispaly = null;
            this.gameDispaly = null;
            this.gameTimer = null;
            this.commandManager = null;
            this.showDebug = false;
            this.onGameEnd = new Lemmings.EventHandler();
            this.finalGameState = Lemmings.GameStateTypes.UNKNOWN;
            this.gameResources = gameResources;
        }
        setGameDispaly(dispaly) {
            this.dispaly = dispaly;
            if (this.gameDispaly != null) {
                this.gameDispaly.setGuiDisplay(dispaly);
                this.dispaly.setScreenPosition(this.level.screenPositionX, 0);
            }
        }
        setGuiDisplay(dispaly) {
            this.guiDispaly = dispaly;
            if (this.gameGui != null) {
                this.gameGui.setGuiDisplay(dispaly);
            }
        }
        /** load a new game/level */
        loadLevel(levelGroupIndex, levelIndex) {
            this.levelGroupIndex = levelGroupIndex;
            this.levelIndex = levelIndex;
            return new Promise((resolve, reject) => {
                this.gameResources.getLevel(this.levelGroupIndex, this.levelIndex)
                    .then(level => {
                    this.gameTimer = new Lemmings.GameTimer(level);
                    this.gameTimer.onGameTick.on(() => {
                        this.onGameTimerTick();
                    });
                    this.commandManager = new Lemmings.CommandManager(this, this.gameTimer);
                    this.skills = new Lemmings.GameSkills(level);
                    this.level = level;
                    this.gameVictoryCondition = new Lemmings.GameVictoryCondition(level);
                    this.triggerManager = new Lemmings.TriggerManager(this.gameTimer);
                    this.triggerManager.addRange(level.triggers);
                    /// request next resources
                    let maskPromis = this.gameResources.getMasks();
                    let lemPromis = this.gameResources.getLemmingsSprite(this.level.colorPalette);
                    return Promise.all([maskPromis, lemPromis]);
                })
                    .then(results => {
                    let masks = results[0];
                    let lemSprite = results[1];
                    let particleTable = new Lemmings.ParticleTable(this.level.colorPalette);
                    /// setup Lemmings
                    this.lemmingManager = new Lemmings.LemmingManager(this.level, lemSprite, this.triggerManager, this.gameVictoryCondition, masks, particleTable);
                    return this.gameResources.getSkillPanelSprite(this.level.colorPalette);
                })
                    .then(skillPanelSprites => {
                    /// setup gui
                    this.gameGui = new Lemmings.GameGui(this, skillPanelSprites, this.skills, this.gameTimer, this.gameVictoryCondition);
                    if (this.guiDispaly != null) {
                        this.gameGui.setGuiDisplay(this.guiDispaly);
                    }
                    this.objectManager = new Lemmings.ObjectManager(this.gameTimer);
                    this.objectManager.addRange(this.level.objects);
                    this.gameDispaly = new Lemmings.GameDisplay(this, this.level, this.lemmingManager, this.objectManager, this.triggerManager);
                    if (this.dispaly != null) {
                        this.gameDispaly.setGuiDisplay(this.dispaly);
                    }
                    /// let's start!
                    resolve(this);
                });
            });
        }
        /** run the game */
        start() {
            this.gameTimer.continue();
        }
        /** end the game */
        stop() {
            this.gameTimer.stop();
            this.gameTimer = null;
            this.onGameEnd.dispose();
            this.onGameEnd = null;
        }
        /** return the game Timer for this game */
        getGameTimer() {
            return this.gameTimer;
        }
        /** increase the amount of skills */
        cheat() {
            this.skills.cheat();
        }
        getGameSkills() {
            return this.skills;
        }
        getLemmingManager() {
            return this.lemmingManager;
        }
        getVictoryCondition() {
            return this.gameVictoryCondition;
        }
        getCommandManager() {
            return this.commandManager;
        }
        queueCmmand(newCommand) {
            this.commandManager.queueCommand(newCommand);
        }
        /** enables / disables the display of debug information */
            setDebugMode(vale) {
            this.showDebug = vale;
        }
        /** run one step in game time and render the result */
        onGameTimerTick() {
            /// run game logic
            this.runGameLogic();
            this.checkForGameOver();
            this.render();
        }
        /** return the current state of the game */
        getGameState() {
            /// if the game has finised return it's saved state
            if (this.finalGameState != Lemmings.GameStateTypes.UNKNOWN) {
                return this.finalGameState;
            }
            let hasWon = this.gameVictoryCondition.getSurvivorsCount() >= this.gameVictoryCondition.getNeedCount();
            /// are there any lemmings alive?
            if ((this.gameVictoryCondition.getLeftCount() <= 0) && (this.gameVictoryCondition.getOutCount() <= 0)) {
                if (hasWon) {
                    return Lemmings.GameStateTypes.SUCCEEDED;
                }
                else {
                    return Lemmings.GameStateTypes.FAILED_LESS_LEMMINGS;
                }
            }
            /// is the game out of time?
            if (this.gameTimer.getGameLeftTime() <= 0) {
                if (hasWon) {
                    return Lemmings.GameStateTypes.SUCCEEDED;
                }
                else {
                    return Lemmings.GameStateTypes.FAILED_OUT_OF_TIME;
                }
            }
            return Lemmings.GameStateTypes.RUNNING;
        }
        /** check if the game  */
        checkForGameOver() {
            if (this.finalGameState != Lemmings.GameStateTypes.UNKNOWN) {
                return;
            }
            let state = this.getGameState();
            if ((state != Lemmings.GameStateTypes.RUNNING) && (state != Lemmings.GameStateTypes.UNKNOWN)) {
                this.gameVictoryCondition.doFinalize();
                this.finalGameState = state;
                this.onGameEnd.trigger(new Lemmings.GameResult(this));
            }
        }
        /** run the game logic one step in time */
        runGameLogic() {
            if (this.level == null) {
                this.log.log("level not loaded!");
                return;
            }
            this.lemmingManager.tick();
        }
        /** refresh display */
        render() {
            if (this.gameDispaly) {
                this.gameDispaly.render();
                if (this.showDebug) {
                    this.gameDispaly.renderDebug();
                }
            }
            if (this.guiDispaly) {
                this.gameGui.render();
            }
            this.guiDispaly.redraw();
        }
    }
    Lemmings.Game = Game;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class AudioConfig {
    }
    Lemmings.AudioConfig = AudioConfig;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class GameConfig {
        constructor() {
            /** Name of the Lemmings Game */
            this.name = "";
            /** Path/Url to the resources */
            this.path = "";
            /** unique GameType Name */
            this.gametype = Lemmings.GameTypes.UNKNOWN;
            this.audioConfig = new Lemmings.AudioConfig();
            this.level = new Lemmings.LevelConfig();
        }
    }
    Lemmings.GameConfig = GameConfig;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class LevelConfig {
        constructor() {
            /** file Prefix used in the filename of the level-file */
            this.filePrefix = "LEVEL";
            /** use the odd-table-file */
            this.useOddTable = false;
            /** the names of the level groups */
            this.groups = [];
            /** sort order of the levels for each group
             *   every entry is a number where:
             *     ->  (FileId * 10 + FilePart) * (useOddTabelEntry? -1 : 1)
             */
            this.order = [];
        }
        getGroupLength(groupIndex) {
            if ((groupIndex < 0) || (groupIndex > this.order.length)) {
                return 0;
            }
            return this.order[groupIndex].length;
        }
    }
    Lemmings.LevelConfig = LevelConfig;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class GameSkills {
        constructor(level) {
            this.selectedSkill = Lemmings.SkillTypes.CLIMBER;
            this.onCountChanged = new Lemmings.EventHandler();
            this.onSelectionChanged = new Lemmings.EventHandler();
            this.skills = level.skills;
        }
        /** return true if the skill can be redused / used */
        canReduseSkill(type) {
            return (this.skills[type] > 0);
        }
        reduseSkill(type) {
            if (this.skills[type] <= 0)
                return false;
            this.skills[type]--;
            this.onCountChanged.trigger(type);
            return true;
        }
        getSkill(type) {
            if (!Lemmings.SkillTypes.isValid(type))
                return 0;
            return this.skills[type];
        }
        getSelectedSkill() {
            return this.selectedSkill;
        }
        setSelectedSkill(skill) {
            if (this.selectedSkill == skill) {
                return false;
            }
            if (!Lemmings.SkillTypes.isValid(skill)) {
                return false;
            }
            this.selectedSkill = skill;
            this.onSelectionChanged.trigger();
            return true;
        }
        /** increase the amount of actions for all skills */
        cheat() {
            for (let i = 0; i < this.skills.length; i++) {
                this.skills[i] = 99;
                this.onCountChanged.trigger(i);
            }
        }
    }
    Lemmings.GameSkills = GameSkills;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class GameTimer {
        constructor(level) {
            this.TIME_PER_FRAME_MS = 60;
            this._speedFactor = 1;
            this.gameTimerHandler = 0;
            /** the current game time in number of steps the game has made  */
            this.tickIndex = 0;
            /** event raising on every tick (one step in time) the game made */
            this.onGameTick = new Lemmings.EventHandler();
            /** event raising on before every tick (one step in time) the game made */
            this.onBeforeGameTick = new Lemmings.EventHandler();
            this.ticksTimeLimit = this.secondsToTicks(level.timeLimit * 60);
        }
        /** return if the game timer is running or not */
        isRunning() {
            return (this.gameTimerHandler != 0);
        }
        /** define a factor to speed up >1 or slow down <1 the game */
        get speedFactor() {
            return this._speedFactor;
        }
        /** set a factor to speed up >1 or slow down <1 the game */
        set speedFactor(newSpeedFactor) {
            this._speedFactor = newSpeedFactor;
            if (!this.isRunning()) {
                return;
            }
            this.suspend();
            this.continue();
        }
        /** Pause the game */
        suspend() {
            if (this.gameTimerHandler != 0) {
                clearInterval(this.gameTimerHandler);
            }
            this.gameTimerHandler = 0;
        }
        /** End the game */
        stop() {
            this.suspend();
            this.onBeforeGameTick.dispose();
            this.onGameTick.dispose();
        }
        /** toggle between suspend and continue */
        toggle() {
            if (this.isRunning()) {
                this.suspend();
            }
            else {
                this.continue();
            }
        }
        /** Run the game timer */
        continue() {
            if (this.isRunning()) {
                return;
            }
            this.gameTimerHandler = setInterval(() => {
                this.tick();
            }, (this.TIME_PER_FRAME_MS / this._speedFactor));
        }
        /** run the game one step in time */
        tick() {
            if (this.onBeforeGameTick != null)
                this.onBeforeGameTick.trigger(this.tickIndex);
            this.tickIndex++;
            if (this.onGameTick != null)
                this.onGameTick.trigger();
        }
        /** return the past game time in seconds */
        getGameTime() {
            return Math.floor(this.ticksToSeconds(this.tickIndex));
        }
        /** return the past game time in ticks */
        getGameTicks() {
            return this.tickIndex;
        }
        /** return the left game time in seconds */
        getGameLeftTime() {
            let leftTicks = this.ticksTimeLimit - this.tickIndex;
            if (leftTicks < 0)
                leftTicks = 0;
            return Math.floor(this.ticksToSeconds(leftTicks));
        }
        /** return the left game time in seconds */
        getGameLeftTimeString() {
            let leftSeconds = this.getGameLeftTime();
            let secondsStr = "0" + Math.floor(leftSeconds % 60);
            return Math.floor(leftSeconds / 60) + "-" + secondsStr.substr(secondsStr.length - 2, 2);
        }
        /** convert a game-ticks-time to in game-seconds. Returns Float */
        ticksToSeconds(ticks) {
            return ticks * (this.TIME_PER_FRAME_MS / 1000);
        }
        /** calc the number ticks form game-time in seconds  */
        secondsToTicks(seconds) {
            return seconds * (1000 / this.TIME_PER_FRAME_MS);
        }
        /** return the maximum time in seconds to win the game  */
        getGameTimeLimit() {
            return this.ticksTimeLimit;
        }
    }
    Lemmings.GameTimer = GameTimer;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /// Handels the number of lemmings
    ///  - needed to win or lose the game
    ///  - release rate
    class GameVictoryCondition {
        constructor(level) {
            this.isFinalize = false;
            this.needCount = level.needCount;
            this.releaseCount = level.releaseCount;
            this.leftCount = level.releaseCount;
            this.minReleaseRate = level.releaseRate;
            this.releaseRate = level.releaseRate;
            this.survivorCount = 0;
            this.outCount = 0;
        }
        getNeedCount() {
            return this.needCount;
        }
        getReleaseCount() {
            return this.releaseCount;
        }
        changeReleaseRate(count) {
            if (this.isFinalize) {
                return false;
            }
            let oldReleaseRate = this.releaseRate;
            let newReleaseRate = this.boundToRange(this.minReleaseRate, this.releaseRate + count, GameVictoryCondition.maxReleaseRate);
            if (newReleaseRate == oldReleaseRate) {
                return false;
            }
            this.releaseRate = newReleaseRate;
            return true;
        }
        boundToRange(min, value, max) {
            return Math.min(max, Math.max(min, value | 0)) | 0;
        }
        getMinReleaseRate() {
            return this.minReleaseRate;
        }
        getCurrentReleaseRate() {
            return this.releaseRate;
        }
        /** one lemming reached the exit */
        addSurvivor() {
            if (this.isFinalize) {
                return;
            }
            this.survivorCount++;
        }
        /** number of rescued lemmings */
        getSurvivorsCount() {
            return this.survivorCount;
        }
        /** number of rescued lemmings in percentage */
        getSurvivorPercentage() {
            return Math.floor(this.survivorCount / this.releaseCount * 100) | 0;
        }
        /** number of alive lemmings out in the level */
        getOutCount() {
            return this.outCount;
        }
        /** the number of lemmings not yet released */
        getLeftCount() {
            return this.leftCount;
        }
        /** release one new lemming */
        releaseOne() {
            if ((this.isFinalize) || (this.leftCount <= 0)) {
                return;
            }
            this.leftCount--;
            this.outCount++;
        }
        /** if a lemming die */
        removeOne() {
            if (this.isFinalize) {
                return;
            }
            this.outCount--;
        }
        /** stop releasing lemmings */
        doNuke() {
            if (this.isFinalize) {
                return;
            }
            this.leftCount = 0;
        }
        /** stop any changing in the conditions */
        doFinalize() {
            if (this.isFinalize) {
                return;
            }
            this.isFinalize = true;
        }
    }
    GameVictoryCondition.maxReleaseRate = 99;
    Lemmings.GameVictoryCondition = GameVictoryCondition;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    var LemmingStateType;
    (function (LemmingStateType) {
        LemmingStateType[LemmingStateType["NO_STATE_TYPE"] = 0] = "NO_STATE_TYPE";
        LemmingStateType[LemmingStateType["WALKING"] = 1] = "WALKING";
        LemmingStateType[LemmingStateType["SPLATTING"] = 2] = "SPLATTING";
        LemmingStateType[LemmingStateType["EXPLODING"] = 3] = "EXPLODING";
        LemmingStateType[LemmingStateType["FALLING"] = 4] = "FALLING";
        LemmingStateType[LemmingStateType["JUMPING"] = 5] = "JUMPING";
        LemmingStateType[LemmingStateType["DIGGING"] = 6] = "DIGGING";
        LemmingStateType[LemmingStateType["CLIMBING"] = 7] = "CLIMBING";
        LemmingStateType[LemmingStateType["HOISTING"] = 8] = "HOISTING";
        LemmingStateType[LemmingStateType["BUILDING"] = 9] = "BUILDING";
        LemmingStateType[LemmingStateType["BLOCKING"] = 10] = "BLOCKING";
        LemmingStateType[LemmingStateType["BASHING"] = 11] = "BASHING";
        LemmingStateType[LemmingStateType["FLOATING"] = 12] = "FLOATING";
        LemmingStateType[LemmingStateType["MINEING"] = 13] = "MINEING";
        LemmingStateType[LemmingStateType["DROWNING"] = 14] = "DROWNING";
        LemmingStateType[LemmingStateType["EXITING"] = 15] = "EXITING";
        LemmingStateType[LemmingStateType["FRYING"] = 16] = "FRYING";
        LemmingStateType[LemmingStateType["OHNO"] = 17] = "OHNO";
        LemmingStateType[LemmingStateType["SHRUG"] = 18] = "SHRUG";
        LemmingStateType[LemmingStateType["OUT_OFF_LEVEL"] = 19] = "OUT_OFF_LEVEL";
    })(LemmingStateType = Lemmings.LemmingStateType || (Lemmings.LemmingStateType = {}));
})(Lemmings || (Lemmings = {}));
/// <reference path="./lemming-state-type.ts"/>
var Lemmings;
(function (Lemmings) {
    class LemmingManager {
        constructor(level, lemmingsSprite, triggerManager, gameVictoryCondition, masks, particleTable) {
            this.level = level;
            this.triggerManager = triggerManager;
            this.gameVictoryCondition = gameVictoryCondition;
            /** list of all Lemming in the game */
            this.lemmings = [];
            /** list of all Actions a Lemming can do */
            this.actions = [];
            this.skillActions = [];
            this.releaseTickIndex = 0;
            this.logging = new Lemmings.LogHandler("LemmingManager");
            /** next lemming index need to explode */
            this.nextNukingLemmingsIndex = -1;
            this.actions[Lemmings.LemmingStateType.WALKING] = new Lemmings.ActionWalkSystem(lemmingsSprite);
            this.actions[Lemmings.LemmingStateType.FALLING] = new Lemmings.ActionFallSystem(lemmingsSprite);
            this.actions[Lemmings.LemmingStateType.JUMPING] = new Lemmings.ActionJumpSystem(lemmingsSprite);
            this.actions[Lemmings.LemmingStateType.DIGGING] = new Lemmings.ActionDiggSystem(lemmingsSprite);
            this.actions[Lemmings.LemmingStateType.EXITING] = new Lemmings.ActionExitingSystem(lemmingsSprite, gameVictoryCondition);
            this.actions[Lemmings.LemmingStateType.FLOATING] = new Lemmings.ActionFloatingSystem(lemmingsSprite);
            this.actions[Lemmings.LemmingStateType.BLOCKING] = new Lemmings.ActionBlockerSystem(lemmingsSprite, triggerManager);
            this.actions[Lemmings.LemmingStateType.MINEING] = new Lemmings.ActionMineSystem(lemmingsSprite, masks);
            this.actions[Lemmings.LemmingStateType.CLIMBING] = new Lemmings.ActionClimbSystem(lemmingsSprite);
            this.actions[Lemmings.LemmingStateType.HOISTING] = new Lemmings.ActionHoistSystem(lemmingsSprite);
            this.actions[Lemmings.LemmingStateType.BASHING] = new Lemmings.ActionBashSystem(lemmingsSprite, masks);
            this.actions[Lemmings.LemmingStateType.BUILDING] = new Lemmings.ActionBuildSystem(lemmingsSprite);
            this.actions[Lemmings.LemmingStateType.SHRUG] = new Lemmings.ActionShrugSystem(lemmingsSprite);
            this.actions[Lemmings.LemmingStateType.EXPLODING] = new Lemmings.ActionExplodingSystem(lemmingsSprite, masks, triggerManager, particleTable);
            this.actions[Lemmings.LemmingStateType.OHNO] = new Lemmings.ActionOhNoSystem(lemmingsSprite);
            this.actions[Lemmings.LemmingStateType.SPLATTING] = new Lemmings.ActionSplatterSystem(lemmingsSprite);
            this.actions[Lemmings.LemmingStateType.DROWNING] = new Lemmings.ActionDrowningSystem(lemmingsSprite);
            this.skillActions[Lemmings.SkillTypes.DIGGER] = this.actions[Lemmings.LemmingStateType.DIGGING];
            this.skillActions[Lemmings.SkillTypes.FLOATER] = this.actions[Lemmings.LemmingStateType.FLOATING];
            this.skillActions[Lemmings.SkillTypes.BLOCKER] = this.actions[Lemmings.LemmingStateType.BLOCKING];
            this.skillActions[Lemmings.SkillTypes.MINER] = this.actions[Lemmings.LemmingStateType.MINEING];
            this.skillActions[Lemmings.SkillTypes.CLIMBER] = this.actions[Lemmings.LemmingStateType.CLIMBING];
            this.skillActions[Lemmings.SkillTypes.BASHER] = this.actions[Lemmings.LemmingStateType.BASHING];
            this.skillActions[Lemmings.SkillTypes.BUILDER] = this.actions[Lemmings.LemmingStateType.BUILDING];
            this.skillActions[Lemmings.SkillTypes.BOMBER] = new Lemmings.ActionCountdownSystem(masks);
            /// wait before first lemming is spawn
            this.releaseTickIndex = this.gameVictoryCondition.getCurrentReleaseRate() - 30;
        }
        processNewAction(lem, newAction) {
            if (newAction == Lemmings.LemmingStateType.NO_STATE_TYPE) {
                return false;
            }
            this.setLemmingState(lem, newAction);
            return true;
        }
        /** process all Lemmings to the next time-step */
        tick() {
            this.addNewLemmings();
            let lems = this.lemmings;
            if (this.isNuking()) {
                this.doLemmingAction(lems[this.nextNukingLemmingsIndex], Lemmings.SkillTypes.BOMBER);
                this.nextNukingLemmingsIndex++;
            }
            for (let i = 0; i < lems.length; i++) {
                let lem = lems[i];
                if (lem.removed)
                    continue;
                let newAction = lem.process(this.level);
                this.processNewAction(lem, newAction);
                let triggerAction = this.runTrigger(lem);
                this.processNewAction(lem, triggerAction);
            }
        }
        /** Add a new Lemming to the manager */
        addLemming(x, y) {
            let lem = new Lemmings.Lemming(x, y, this.lemmings.length);
            this.setLemmingState(lem, Lemmings.LemmingStateType.FALLING);
            this.lemmings.push(lem);
        }
        /** let a new lemming arise from an entrance */
        addNewLemmings() {
            if (this.gameVictoryCondition.getLeftCount() <= 0) {
                return;
            }
            this.releaseTickIndex++;
            if (this.releaseTickIndex >= (104 - this.gameVictoryCondition.getCurrentReleaseRate())) {
                this.releaseTickIndex = 0;
                let entrance = this.level.entrances[0];
                this.addLemming(entrance.x + 24, entrance.y + 14);
                this.gameVictoryCondition.releaseOne();
            }
        }
        runTrigger(lem) {
            if (lem.isRemoved() || (lem.isDisabled())) {
                return Lemmings.LemmingStateType.NO_STATE_TYPE;
            }
            let triggerType = this.triggerManager.trigger(lem.x, lem.y);
            switch (triggerType) {
                case Lemmings.TriggerTypes.NO_TRIGGER:
                    return Lemmings.LemmingStateType.NO_STATE_TYPE;
                case Lemmings.TriggerTypes.DROWN:
                    return Lemmings.LemmingStateType.DROWNING;
                case Lemmings.TriggerTypes.EXIT_LEVEL:
                    return Lemmings.LemmingStateType.EXITING;
                case Lemmings.TriggerTypes.KILL:
                    return Lemmings.LemmingStateType.SPLATTING;
                case Lemmings.TriggerTypes.TRAP:
                    return Lemmings.LemmingStateType.HOISTING;
                case Lemmings.TriggerTypes.BLOCKER_LEFT:
                    if (lem.lookRight)
                        lem.lookRight = false;
                    return Lemmings.LemmingStateType.NO_STATE_TYPE;
                case Lemmings.TriggerTypes.BLOCKER_RIGHT:
                    if (!lem.lookRight)
                        lem.lookRight = true;
                    return Lemmings.LemmingStateType.NO_STATE_TYPE;
                default:
                    this.logging.log("unknown trigger type: " + triggerType);
                    return Lemmings.LemmingStateType.NO_STATE_TYPE;
            }
        }
        /** render all Lemmings to the GameDisplay */
        render(gameDisplay) {
            let lems = this.lemmings;
            for (let i = 0; i < lems.length; i++) {
                lems[i].render(gameDisplay);
            }
        }
        /** render all Lemmings to the GameDisplay */
        renderDebug(gameDisplay) {
            let lems = this.lemmings;
            for (let i = 0; i < lems.length; i++) {
                lems[i].renderDebug(gameDisplay);
            }
        }
        /** return the lemming with a given id */
        getLemming(id) {
            return this.lemmings[id];
        }
        /** return a lemming a a geiven position */
        getLemmingAt(x, y) {
            let lems = this.lemmings;
            let minDistance = 99999;
            let minDistanceLem = null;
            for (let i = 0; i < lems.length; i++) {
                let lem = lems[i];
                let distance = lem.getClickDistance(x, y);
                //console.log("--> "+ distance);
                if ((distance < 0) || (distance >= minDistance)) {
                    continue;
                }
                minDistance = distance;
                minDistanceLem = lem;
            }
            //console.log("====> "+ (minDistanceLem? minDistanceLem.id : "null"));
            return minDistanceLem;
        }
        /** change the action a Lemming is doing */
        setLemmingState(lem, stateType) {
            if (stateType == Lemmings.LemmingStateType.OUT_OFF_LEVEL) {
                lem.remove();
                this.gameVictoryCondition.removeOne();
                return;
            }
            let actionSystem = this.actions[stateType];
            if (actionSystem == null) {
                lem.remove();
                this.logging.log(lem.id + " Action: Error not an action: " + Lemmings.LemmingStateType[stateType]);
                return;
            }
            else {
                this.logging.debug(lem.id + " Action: " + actionSystem.getActionName());
            }
            lem.setAction(actionSystem);
        }
        /** change the action a Lemming is doing */
        doLemmingAction(lem, skillType) {
            if (lem == null) {
                return false;
            }
            let actionSystem = this.skillActions[skillType];
            if (!actionSystem) {
                this.logging.log(lem.id + " Unknown Action: " + skillType);
                return false;
            }
            return actionSystem.triggerLemAction(lem);
        }
        /** return if the game is in nuke state */
        isNuking() {
            return this.nextNukingLemmingsIndex >= 0;
        }
        /** start the nuking of all lemmings */
        doNukeAllLemmings() {
            this.nextNukingLemmingsIndex = 0;
        }
    }
    Lemmings.LemmingManager = LemmingManager;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class Lemming {
        constructor(x, y, id) {
            this.x = 0;
            this.y = 0;
            this.lookRight = true;
            this.frameIndex = 0;
            this.canClimb = false;
            this.hasParachute = false;
            this.removed = false;
            this.countdown = 0;
            this.state = 0;
            this.disabled = false;
            this.x = x;
            this.y = y;
            this.id = id;
        }
        /** return the number shown as countdown */
        getCountDownTime() {
            return (8 - (this.countdown >> 4));
        }
        /** switch the action of this lemming */
        setAction(action) {
            this.action = action;
            this.frameIndex = 0;
            this.state = 0;
        }
        /** set the countdown action of this lemming */
        setCountDown(action) {
            this.countdownAction = action;
            if (this.countdown > 0) {
                return false;
            }
            this.countdown = 80;
            return true;
        }
        /** return the distance of this lemming to a given position */
        getClickDistance(x, y) {
            let yCenter = this.y - 5;
            let xCenter = this.x;
            let x1 = xCenter - 5;
            let y1 = yCenter - 6;
            let x2 = xCenter + 5;
            let y2 = yCenter + 7;
            //console.log(this.id + " : "+ x1 +"-"+ x2 +"  "+ y1 +"-"+ y2);
            if ((x >= x1) && (x <= x2) && (y >= y1) && (y < y2)) {
                return ((yCenter - y) * (yCenter - y) + (xCenter - x) * (xCenter - x));
            }
            return -1;
        }
        /** render this lemming to the display */
        render(gameDisplay) {
            if (!this.action) {
                return;
            }
            if (this.countdownAction != null) {
                this.countdownAction.draw(gameDisplay, this);
            }
            this.action.draw(gameDisplay, this);
        }
        /** render this lemming debug "information" to the display */
        renderDebug(gameDisplay) {
            if (!this.action) {
                return;
            }
            gameDisplay.setDebugPixel(this.x, this.y);
        }
        /** process this lemming one tick in time */
        process(level) {
            if ((this.x < 0) || (this.x >= level.width) || (this.y < 0) || (this.y >= level.height + 6)) {
                return Lemmings.LemmingStateType.OUT_OFF_LEVEL;
            }
            /// run main action
            if (!this.action) {
                return Lemmings.LemmingStateType.OUT_OFF_LEVEL;
            }
            /// run secondary action
            if (this.countdownAction) {
                let newAction = this.countdownAction.process(level, this);
                if (newAction != Lemmings.LemmingStateType.NO_STATE_TYPE) {
                    return newAction;
                }
            }
            if (this.action) {
                return this.action.process(level, this);
            }
        }
        /** disable this lemming so it can not longer be triggert
         *   or beeing selected by the user */
        disable() {
            this.disabled = true;
        }
        /** remove this lemming */
        remove() {
            this.action = null;
            this.countdownAction = null;
            this.removed = true;
        }
        isDisabled() {
            return this.disabled;
        }
        isRemoved() {
            return (this.action == null);
        }
    }
    Lemming.LEM_MIN_Y = -5;
    Lemming.LEM_MAX_FALLING = 60;
    Lemmings.Lemming = Lemming;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** represent a object (e.g. Exit, Entry, Trap, ...) */
    class MapObject {
        constructor(ob, objectImg) {
            this.x = ob.x;
            this.y = ob.y;
            this.drawProperties = ob.drawProperties;
            this.animation = new Lemmings.Animation();
            this.animation.isRepeat = objectImg.animationLoop;
            this.animation.firstFrameIndex = objectImg.firstFrameIndex;
            for (let i = 0; i < objectImg.frames.length; i++) {
                let newFrame = new Lemmings.Frame(objectImg.width, objectImg.height);
                //newFrame.clear();
                newFrame.drawPaletteImage(objectImg.frames[i], objectImg.width, objectImg.height, objectImg.palette, 0, 0);
                this.animation.frames.push(newFrame);
            }
        }
    }
    Lemmings.MapObject = MapObject;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** manages all objects on the map */
    class ObjectManager {
        constructor(gameTimer) {
            this.gameTimer = gameTimer;
            this.objects = [];
        }
        /** render all Objects to the GameDisplay */
        render(gameDisplay) {
            let objs = this.objects;
            let tick = this.gameTimer.getGameTicks();
            for (let i = 0; i < objs.length; i++) {
                let obj = objs[i];
                gameDisplay.drawFrameFlags(obj.animation.getFrame(tick), obj.x, obj.y, obj.drawProperties);
            }
        }
        /** add map objects to manager */
        addRange(mapObjects) {
            for (let i = 0; i < mapObjects.length; i++) {
                this.objects.push(mapObjects[i]);
            }
        }
    }
    Lemmings.ObjectManager = ObjectManager;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** the skills/behaviors a Lemming could have */
    var SkillTypes;
    (function (SkillTypes) {
        SkillTypes[SkillTypes["UNKNOWN"] = 0] = "UNKNOWN";
        SkillTypes[SkillTypes["CLIMBER"] = 1] = "CLIMBER";
        SkillTypes[SkillTypes["FLOATER"] = 2] = "FLOATER";
        SkillTypes[SkillTypes["BOMBER"] = 3] = "BOMBER";
        SkillTypes[SkillTypes["BLOCKER"] = 4] = "BLOCKER";
        SkillTypes[SkillTypes["BUILDER"] = 5] = "BUILDER";
        SkillTypes[SkillTypes["BASHER"] = 6] = "BASHER";
        SkillTypes[SkillTypes["MINER"] = 7] = "MINER";
        SkillTypes[SkillTypes["DIGGER"] = 8] = "DIGGER";
    })(SkillTypes = Lemmings.SkillTypes || (Lemmings.SkillTypes = {}));
    ;
    /** helper functions for SkillTypes */
    (function (SkillTypes) {
        function toString(type) {
            return SkillTypes[type];
        }
        SkillTypes.toString = toString;
        function length() {
            return 9;
        }
        SkillTypes.length = length;
        function isValid(type) {
            if (type == null)
                return false;
            return ((type > SkillTypes.UNKNOWN) && (type < SkillTypes.length()));
        }
        SkillTypes.isValid = isValid;
    })(SkillTypes = Lemmings.SkillTypes || (Lemmings.SkillTypes = {}));
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** manage the in-game Lemmings animation sprite */
    class LemmingsSprite {
        constructor(fr, colorPalette) {
            this.lemmingAnimation = []; //- Loockup table from ActionType -> this.animations(); First Element: left-move, Second: right-move
            this.colorPalette = colorPalette;
            this.registerAnimation(Lemmings.SpriteTypes.WALKING, 1, fr, 2, 16, 10, -8, -10, 8); //- walking (r)
            this.registerAnimation(Lemmings.SpriteTypes.JUMPING, 1, fr, 2, 16, 10, -8, -10, 1); //- jumping (r)
            this.registerAnimation(Lemmings.SpriteTypes.WALKING, -1, fr, 2, 16, 10, -8, -10, 8); //- walking (l)
            this.registerAnimation(Lemmings.SpriteTypes.JUMPING, -1, fr, 2, 16, 10, -8, -10, 1); //- jumping (l)
            this.registerAnimation(Lemmings.SpriteTypes.DIGGING, 0, fr, 3, 16, 14, -8, -12, 16); //- digging
            this.registerAnimation(Lemmings.SpriteTypes.CLIMBING, 1, fr, 2, 16, 12, -8, -12, 8); //- climbing (r)
            this.registerAnimation(Lemmings.SpriteTypes.CLIMBING, -1, fr, 2, 16, 12, -8, -12, 8); //- climbing (l)
            this.registerAnimation(Lemmings.SpriteTypes.DROWNING, 0, fr, 2, 16, 10, -8, -10, 16); //- drowning
            this.registerAnimation(Lemmings.SpriteTypes.POSTCLIMBING, 1, fr, 2, 16, 12, -8, -12, 8); //- post-climb (r)
            this.registerAnimation(Lemmings.SpriteTypes.POSTCLIMBING, -1, fr, 2, 16, 12, -8, -12, 8); //- post-climb (l)
            this.registerAnimation(Lemmings.SpriteTypes.BUILDING, 1, fr, 3, 16, 13, -8, -13, 16); //- brick-laying (r)
            this.registerAnimation(Lemmings.SpriteTypes.BUILDING, -1, fr, 3, 16, 13, -8, -13, 16); //- brick-laying (l)
            this.registerAnimation(Lemmings.SpriteTypes.BASHING, 1, fr, 3, 16, 10, -8, -10, 32); //- bashing (r)
            this.registerAnimation(Lemmings.SpriteTypes.BASHING, -1, fr, 3, 16, 10, -8, -10, 32); //- bashing (l)
            this.registerAnimation(Lemmings.SpriteTypes.MINEING, 1, fr, 3, 16, 13, -8, -12, 24); //- mining (r)
            this.registerAnimation(Lemmings.SpriteTypes.MINEING, -1, fr, 3, 16, 13, -8, -12, 24); //- mining (l)
            this.registerAnimation(Lemmings.SpriteTypes.FALLING, 1, fr, 2, 16, 10, -8, -10, 4); //- falling (r)
            this.registerAnimation(Lemmings.SpriteTypes.FALLING, -1, fr, 2, 16, 10, -8, -10, 4); //- falling (l)
            this.registerAnimation(Lemmings.SpriteTypes.UMBRELLA, 1, fr, 3, 16, 16, -8, -16, 8); //- pre-umbrella (r)
            this.registerAnimation(Lemmings.SpriteTypes.UMBRELLA, -1, fr, 3, 16, 16, -8, -16, 8); //- umbrella (r)
            this.registerAnimation(Lemmings.SpriteTypes.SPLATTING, 0, fr, 2, 16, 10, -8, -10, 16); //- splatting
            this.registerAnimation(Lemmings.SpriteTypes.EXITING, 0, fr, 2, 16, 13, -8, -13, 8); //- exiting
            this.registerAnimation(Lemmings.SpriteTypes.FRYING, 1, fr, 4, 16, 14, -8, -10, 14); //- fried
            this.registerAnimation(Lemmings.SpriteTypes.BLOCKING, 0, fr, 2, 16, 10, -8, -10, 16); //- blocking
            this.registerAnimation(Lemmings.SpriteTypes.SHRUGGING, 1, fr, 2, 16, 10, -8, -10, 8); //- shrugging (r)
            this.registerAnimation(Lemmings.SpriteTypes.SHRUGGING, 0, fr, 2, 16, 10, -8, -10, 8); //- shrugging (l)
            this.registerAnimation(Lemmings.SpriteTypes.OHNO, 0, fr, 2, 16, 10, -8, -10, 16); //- oh-no-ing
            this.registerAnimation(Lemmings.SpriteTypes.EXPLODING, 0, fr, 3, 32, 32, -8, -10, 1); //- explosion
        }
        /** return the animation for a given animation type */
        getAnimation(state, right) {
            return this.lemmingAnimation[this.typeToIndex(state, right)];
        }
        typeToIndex(state, right) {
            return state * 2 + (right ? 0 : 1);
        }
        registerAnimation(state, dir, fr, bitsPerPixle, width, height, offsetX, offsetY, frames) {
            //- load animation frames from file (fr)
            var animation = new Lemmings.Animation();
            animation.loadFromFile(fr, bitsPerPixle, width, height, frames, this.colorPalette, offsetX, offsetY);
            //- add animation to cache -add unidirectional (dir == 0) annimations to both lists
            if (dir >= 0) {
                this.lemmingAnimation[this.typeToIndex(state, true)] = animation;
            }
            if (dir <= 0) {
                this.lemmingAnimation[this.typeToIndex(state, false)] = animation;
            }
        }
    }
    Lemmings.LemmingsSprite = LemmingsSprite;
})(Lemmings || (Lemmings = {}));
/// <reference path="../resources/lemmings-sprite.ts"/>
var Lemmings;
(function (Lemmings) {
    class SoundSystem {
        constructor() {
        }
        playSound(lem, soundId) {
            // console.log("Play sound " + soundId);
        }
    }
    Lemmings.SoundSystem = SoundSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** manages all triggers */
    class TriggerManager {
        constructor(gameTimer) {
            this.gameTimer = gameTimer;
            this.triggers = [];
        }
        /** add a new trigger to the manager */
        add(trigger) {
            this.triggers.push(trigger);
        }
        /** remove all triggers having a giving owner */
        removeByOwner(owner) {
            let triggerIndex = (this.triggers.length - 1);
            while (triggerIndex >= 0) {
                triggerIndex = this.triggers.findIndex((t) => t.owner == owner);
                if (triggerIndex >= 0) {
                    this.triggers.splice(triggerIndex, 1);
                }
            }
        }
        /** add a new trigger to the manager */
        remove(trigger) {
            let triggerIndex = this.triggers.indexOf(trigger);
            this.triggers.splice(triggerIndex, 1);
        }
        addRange(newTriggers) {
            for (let i = 0; i < newTriggers.length; i++) {
                this.triggers.push(newTriggers[i]);
            }
        }
        renderDebug(gameDisplay) {
            for (let i = 0; i < this.triggers.length; i++) {
                this.triggers[i].draw(gameDisplay);
            }
        }
        /** test all triggers. Returns the triggered type that matches */
        trigger(x, y) {
            let l = this.triggers.length;
            let tick = this.gameTimer.getGameTicks();
            for (var i = 0; i < l; i++) {
                let type = this.triggers[i].trigger(x, y, tick);
                if (type != Lemmings.TriggerTypes.NO_TRIGGER)
                    return type;
            }
            return Lemmings.TriggerTypes.NO_TRIGGER;
        }
    }
    Lemmings.TriggerManager = TriggerManager;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** A trigger that can be hit by a lemming */
    class Trigger {
        constructor(type, x1, y1, x2, y2, disableTicksCount = 0, soundIndex = -1, owner = null) {
            this.owner = null;
            this.x1 = 0;
            this.y1 = 0;
            this.x2 = 0;
            this.y2 = 0;
            this.type = Lemmings.TriggerTypes.NO_TRIGGER;
            this.disableTicksCount = 0;
            this.disabledUntilTick = 0;
            this.owner = owner;
            this.type = type;
            this.x1 = Math.min(x1, x2);
            this.y1 = Math.min(y1, y2);
            this.x2 = Math.max(x1, x2);
            this.y2 = Math.max(y1, y2);
            this.disableTicksCount = disableTicksCount;
            this.soundIndex = soundIndex;
        }
        trigger(x, y, tick) {
            if (this.disabledUntilTick <= tick) {
                if ((x >= this.x1) && (y >= this.y1) && (x <= this.x2) && (y <= this.y2)) {
                    this.disabledUntilTick = tick + this.disableTicksCount;
                    return this.type;
                }
            }
            return Lemmings.TriggerTypes.NO_TRIGGER;
        }
        draw(gameDisplay) {
            gameDisplay.drawRect(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1, 255, 0, 0);
        }
    }
    Lemmings.Trigger = Trigger;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionBashSystem {
        constructor(sprites, masks) {
            this.soundSystem = new Lemmings.SoundSystem();
            this.sprite = [];
            this.masks = [];
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.BASHING, false));
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.BASHING, true));
            this.masks.push(masks.GetMask(Lemmings.MaskTypes.BASHING_L));
            this.masks.push(masks.GetMask(Lemmings.MaskTypes.BASHING_R));
        }
        getActionName() {
            return "bashing";
        }
        /** user called this action */
        triggerLemAction(lem) {
            lem.setAction(this);
            return true;
        }
        /** render Lemming to gamedisply */
        draw(gameDisplay, lem) {
            let ani = this.sprite[(lem.lookRight ? 1 : 0)];
            let frame = ani.getFrame(lem.frameIndex);
            gameDisplay.drawFrame(frame, lem.x, lem.y);
        }
        process(level, lem) {
            let groundMask = level.getGroundMaskLayer();
            lem.frameIndex++;
            let state = lem.frameIndex % 16;
            /// move lemming
            if (state > 10) {
                lem.x += (lem.lookRight ? 1 : -1);
                let yDelta = this.findGapDelta(groundMask, lem.x, lem.y);
                lem.y += yDelta;
                if (yDelta == 3) {
                    return Lemmings.LemmingStateType.FALLING;
                }
            }
            /// apply mask
            if ((state > 1) && (state < 6)) {
                let mask = this.masks[(lem.lookRight ? 1 : 0)];
                let maskIndex = state - 2;
                level.clearGroundWithMask(mask.GetMask(maskIndex), lem.x, lem.y);
            }
            /// check if end of solid?
            if (state == 5) {
                if (this.findHorizontalSpace(groundMask, lem.x + (lem.lookRight ? 8 : -8), lem.y - 6, lem.lookRight) == 4) {
                    return Lemmings.LemmingStateType.WALKING;
                }
            }
            return Lemmings.LemmingStateType.NO_STATE_TYPE;
        }
        findGapDelta(groundMask, x, y) {
            for (let i = 0; i < 3; i++) {
                if (groundMask.hasGroundAt(x, y + i)) {
                    return i;
                }
            }
            return 3;
        }
        findHorizontalSpace(groundMask, x, y, lookRight) {
            for (let i = 0; i < 4; i++) {
                if (groundMask.hasGroundAt(x, y)) {
                    return i;
                }
                x += (lookRight ? 1 : -1);
            }
            return 4;
        }
    }
    Lemmings.ActionBashSystem = ActionBashSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionBlockerSystem {
        constructor(sprites, triggerManager) {
            this.triggerManager = triggerManager;
            this.soundSystem = new Lemmings.SoundSystem();
            this.sprite = sprites.getAnimation(Lemmings.SpriteTypes.BLOCKING, false);
        }
        getActionName() {
            return "blocking";
        }
        triggerLemAction(lem) {
            lem.setAction(this);
            return true;
        }
        draw(gameDisplay, lem) {
            let frame = this.sprite.getFrame(lem.frameIndex);
            gameDisplay.drawFrame(frame, lem.x, lem.y);
        }
        process(level, lem) {
            if (lem.state == 0) {
                let trigger1 = new Lemmings.Trigger(Lemmings.TriggerTypes.BLOCKER_LEFT, lem.x - 6, lem.y + 4, lem.x - 3, lem.y - 10, 0, 0, lem);
                let trigger2 = new Lemmings.Trigger(Lemmings.TriggerTypes.BLOCKER_RIGHT, lem.x + 7, lem.y + 4, lem.x + 4, lem.y - 10, 0, 0, lem);
                this.triggerManager.add(trigger1);
                this.triggerManager.add(trigger2);
                lem.state = 1;
            }
            lem.frameIndex++;
            if (!level.hasGroundAt(lem.x, lem.y + 1)) {
                this.triggerManager.removeByOwner(lem);
                return Lemmings.LemmingStateType.FALLING;
            }
            return Lemmings.LemmingStateType.NO_STATE_TYPE;
        }
    }
    Lemmings.ActionBlockerSystem = ActionBlockerSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionBuildSystem {
        constructor(sprites) {
            this.soundSystem = new Lemmings.SoundSystem();
            this.sprite = [];
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.BUILDING, false));
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.BUILDING, true));
        }
        getActionName() {
            return "building";
        }
        triggerLemAction(lem) {
            lem.setAction(this);
            return true;
        }
        /** render Lemming to gamedisply */
        draw(gameDisplay, lem) {
            let ani = this.sprite[(lem.lookRight ? 1 : 0)];
            let frame = ani.getFrame(lem.frameIndex);
            gameDisplay.drawFrame(frame, lem.x, lem.y);
        }
        process(level, lem) {
            lem.frameIndex = (lem.frameIndex + 1) % 16;
            if (lem.frameIndex == 9) {
                /// lay brick
                var x = lem.x + (lem.lookRight ? 0 : -4);
                for (var i = 0; i < 6; i++) {
                    level.setGroundAt(x + i, lem.y - 1, 7);
                }
                return Lemmings.LemmingStateType.NO_STATE_TYPE;
            }
            if (lem.frameIndex == 0) {
                /// walk 
                lem.y--;
                for (let i = 0; i < 2; i++) {
                    lem.x += (lem.lookRight ? 1 : -1);
                    if (level.hasGroundAt(lem.x, lem.y - 1)) {
                        lem.lookRight = !lem.lookRight;
                        return Lemmings.LemmingStateType.WALKING;
                    }
                }
                lem.state++;
                if (lem.state >= 12) {
                    return Lemmings.LemmingStateType.SHRUG;
                }
                if (level.hasGroundAt(lem.x + (lem.lookRight ? 2 : -2), lem.y - 9)) {
                    lem.lookRight = !lem.lookRight;
                    return Lemmings.LemmingStateType.WALKING;
                }
            }
            return Lemmings.LemmingStateType.NO_STATE_TYPE;
        }
    }
    Lemmings.ActionBuildSystem = ActionBuildSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionClimbSystem {
        constructor(sprites) {
            this.soundSystem = new Lemmings.SoundSystem();
            this.sprite = [];
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.CLIMBING, false));
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.CLIMBING, true));
        }
        getActionName() {
            return "climbing";
        }
        triggerLemAction(lem) {
            if (lem.canClimb) {
                return false;
            }
            lem.canClimb = true;
            return true;
        }
        /** render Lemming to gamedisply */
        draw(gameDisplay, lem) {
            let ani = this.sprite[(lem.lookRight ? 1 : 0)];
            let frame = ani.getFrame(lem.frameIndex);
            gameDisplay.drawFrame(frame, lem.x, lem.y);
        }
        process(level, lem) {
            lem.frameIndex = (lem.frameIndex + 1) % 8;
            if (lem.frameIndex < 4) {
                // check for top
                if (!level.hasGroundAt(lem.x, lem.y - lem.frameIndex - 7)) {
                    lem.y = lem.y - lem.frameIndex + 2;
                    return Lemmings.LemmingStateType.HOISTING;
                }
                return Lemmings.LemmingStateType.NO_STATE_TYPE;
            }
            else {
                lem.y--;
                if (level.hasGroundAt(lem.x + (lem.lookRight ? -1 : 1), lem.y - 8)) {
                    lem.lookRight = !lem.lookRight;
                    lem.x += (lem.lookRight ? 2 : -2);
                    return Lemmings.LemmingStateType.FALLING;
                }
                return Lemmings.LemmingStateType.NO_STATE_TYPE;
            }
        }
    }
    Lemmings.ActionClimbSystem = ActionClimbSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionCountdownSystem {
        constructor(masks) {
            this.soundSystem = new Lemmings.SoundSystem();
            this.numberMasks = masks.GetMask(Lemmings.MaskTypes.NUMBERS);
        }
        getActionName() {
            return "countdown";
        }
        triggerLemAction(lem) {
            return lem.setCountDown(this);
        }
        /** render Lemming to gamedisply */
        draw(gameDisplay, lem) {
            let count = lem.getCountDownTime();
            if (count <= 0) {
                return;
            }
            let numberFrame = this.numberMasks.GetMask(count);
            gameDisplay.drawMask(numberFrame, lem.x, lem.y);
        }
        process(level, lem) {
            if (lem.countdown <= 0) {
                return Lemmings.LemmingStateType.NO_STATE_TYPE;
            }
            lem.countdown--;
            if (lem.countdown == 0) {
                lem.setCountDown(null);
                return Lemmings.LemmingStateType.OHNO;
            }
            return Lemmings.LemmingStateType.NO_STATE_TYPE;
        }
    }
    Lemmings.ActionCountdownSystem = ActionCountdownSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionDiggSystem {
        constructor(sprites) {
            this.soundSystem = new Lemmings.SoundSystem();
            this.sprite = [];
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.DIGGING, false));
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.DIGGING, true));
        }
        draw(gameDisplay, lem) {
            let ani = this.sprite[(lem.lookRight ? 1 : 0)];
            let frame = ani.getFrame(lem.frameIndex);
            gameDisplay.drawFrame(frame, lem.x, lem.y);
        }
        getActionName() {
            return "digging";
        }
        triggerLemAction(lem) {
            lem.setAction(this);
            return true;
        }
        process(level, lem) {
            if (lem.state == 0) {
                this.digRow(level, lem, lem.y - 2);
                this.digRow(level, lem, lem.y - 1);
                lem.state = 1;
            }
            else {
                lem.frameIndex = (lem.frameIndex + 1) % 16;
            }
            if (!(lem.frameIndex & 0x07)) {
                lem.y++;
                if (level.isOutOfLevel(lem.y)) {
                    return Lemmings.LemmingStateType.FALLING;
                }
                if (!this.digRow(level, lem, lem.y - 1)) {
                    return Lemmings.LemmingStateType.FALLING;
                }
            }
            return Lemmings.LemmingStateType.NO_STATE_TYPE;
        }
        digRow(level, lem, y) {
            let removeCount = 0;
            for (let x = lem.x - 4; x < lem.x + 5; x++) {
                if (level.hasGroundAt(x, y)) {
                    level.clearGroundAt(x, y);
                    removeCount++;
                }
            }
            return (removeCount > 0);
        }
    }
    Lemmings.ActionDiggSystem = ActionDiggSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionDrowningSystem {
        constructor(sprites) {
            this.soundSystem = new Lemmings.SoundSystem();
            this.sprite = sprites.getAnimation(Lemmings.SpriteTypes.DROWNING, false);
        }
        getActionName() {
            return "drowning";
        }
        triggerLemAction(lem) {
            return false;
        }
        draw(gameDisplay, lem) {
            let frame = this.sprite.getFrame(lem.frameIndex);
            gameDisplay.drawFrame(frame, lem.x, lem.y);
        }
        process(level, lem) {
            lem.disable();
            lem.frameIndex++;
            if (lem.frameIndex >= 16) {
                return Lemmings.LemmingStateType.OUT_OFF_LEVEL;
            }
            if (!level.hasGroundAt(lem.x + (lem.lookRight ? 8 : -8), lem.y)) {
                lem.x += (lem.lookRight ? 1 : -1);
            }
            else {
                lem.lookRight = !lem.lookRight;
            }
            return Lemmings.LemmingStateType.NO_STATE_TYPE;
        }
    }
    Lemmings.ActionDrowningSystem = ActionDrowningSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionExitingSystem {
        constructor(sprites, gameVictoryCondition) {
            this.gameVictoryCondition = gameVictoryCondition;
            this.soundSystem = new Lemmings.SoundSystem();
            this.sprite = sprites.getAnimation(Lemmings.SpriteTypes.EXITING, false);
        }
        getActionName() {
            return "exiting";
        }
        triggerLemAction(lem) {
            return false;
        }
        draw(gameDisplay, lem) {
            let frame = this.sprite.getFrame(lem.frameIndex);
            gameDisplay.drawFrame(frame, lem.x, lem.y);
        }
        process(level, lem) {
            lem.disable();
            lem.frameIndex++;
            if (lem.frameIndex >= 8) {
                this.gameVictoryCondition.addSurvivor();
                return Lemmings.LemmingStateType.OUT_OFF_LEVEL;
            }
            return Lemmings.LemmingStateType.NO_STATE_TYPE;
        }
    }
    Lemmings.ActionExitingSystem = ActionExitingSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionExplodingSystem {
        constructor(sprites, masks, triggerManager, particleTable) {
            this.triggerManager = triggerManager;
            this.particleTable = particleTable;
            this.soundSystem = new Lemmings.SoundSystem();
            this.mask = masks.GetMask(Lemmings.MaskTypes.EXPLODING);
            this.sprite = sprites.getAnimation(Lemmings.SpriteTypes.EXPLODING, false);
        }
        getActionName() {
            return "exploding";
        }
        triggerLemAction(lem) {
            return false;
        }
        /** render Lemming to gamedisply */
        draw(gameDisplay, lem) {
            if (lem.frameIndex == 0) {
                let frame = this.sprite.getFrame(lem.frameIndex);
                gameDisplay.drawFrame(frame, lem.x, lem.y);
            }
            else {
                this.particleTable.draw(gameDisplay, lem.frameIndex - 1, lem.x, lem.y);
            }
        }
        process(level, lem) {
            lem.disable();
            lem.frameIndex++;
            if (lem.frameIndex == 1) {
                this.triggerManager.removeByOwner(lem);
                level.clearGroundWithMask(this.mask.GetMask(0), lem.x, lem.y);
            }
            if (lem.frameIndex == 52) {
                return Lemmings.LemmingStateType.OUT_OFF_LEVEL;
            }
            return Lemmings.LemmingStateType.NO_STATE_TYPE;
        }
    }
    Lemmings.ActionExplodingSystem = ActionExplodingSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionFallSystem {
        constructor(sprites) {
            this.soundSystem = new Lemmings.SoundSystem();
            this.sprite = [];
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.FALLING, false));
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.FALLING, true));
        }
        getActionName() {
            return "falling";
        }
        triggerLemAction(lem) {
            return false;
        }
        /** render Lemming to gamedisply */
        draw(gameDisplay, lem) {
            let ani = this.sprite[(lem.lookRight ? 1 : 0)];
            let frame = ani.getFrame(lem.frameIndex);
            gameDisplay.drawFrame(frame, lem.x, lem.y);
        }
        process(level, lem) {
            lem.frameIndex++;
            if (lem.state > 16 && (lem.hasParachute)) {
                return Lemmings.LemmingStateType.FLOATING;
            }
            // fall down!
            let i = 0;
            for (; i < 3; i++) {
                if (level.hasGroundAt(lem.x, lem.y + i)) {
                    break;
                }
            }
            lem.y += i;
            if (i == 3) {
                lem.state += i;
                return Lemmings.LemmingStateType.NO_STATE_TYPE;
            }
            else {
                // landed
                if (lem.state > Lemmings.Lemming.LEM_MAX_FALLING) {
                    return Lemmings.LemmingStateType.SPLATTING;
                }
                return Lemmings.LemmingStateType.WALKING;
            }
        }
    }
    Lemmings.ActionFallSystem = ActionFallSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionFloatingSystem {
        constructor(sprites) {
            this.soundSystem = new Lemmings.SoundSystem();
            this.sprite = [];
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.UMBRELLA, false));
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.UMBRELLA, true));
        }
        getActionName() {
            return "floating";
        }
        triggerLemAction(lem) {
            if (lem.hasParachute) {
                return false;
            }
            lem.hasParachute = true;
            return true;
        }
        /** render Lemming to gamedisply */
        draw(gameDisplay, lem) {
            let ani = this.sprite[(lem.lookRight ? 1 : 0)];
            let frame = ani.getFrame(ActionFloatingSystem.floatFrame[lem.frameIndex]);
            gameDisplay.drawFrame(frame, lem.x, lem.y);
        }
        process(level, lem) {
            lem.frameIndex++;
            if (lem.frameIndex >= ActionFloatingSystem.floatFrame.length) {
                /// first 8 are the opening of the umbrella
                lem.frameIndex = 8;
            }
            let speed = ActionFloatingSystem.floatSpeed[lem.frameIndex];
            for (let i = 0; i < speed; i++) {
                if (level.hasGroundAt(lem.x, lem.y + i)) {
                    // landed
                    lem.y += i;
                    return Lemmings.LemmingStateType.WALKING;
                }
            }
            lem.y += speed;
            return Lemmings.LemmingStateType.NO_STATE_TYPE;
        }
    }
    ActionFloatingSystem.floatSpeed = [3, 3, 3, 3, -1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2];
    ActionFloatingSystem.floatFrame = [0, 1, 3, 5, 5, 5, 5, 5, 5, 6, 7, 7, 6, 5, 4, 4];
    Lemmings.ActionFloatingSystem = ActionFloatingSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionHoistSystem {
        constructor(sprites) {
            this.soundSystem = new Lemmings.SoundSystem();
            this.sprite = [];
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.POSTCLIMBING, false));
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.POSTCLIMBING, true));
        }
        getActionName() {
            return "hoist";
        }
        triggerLemAction(lem) {
            return false;
        }
        /** render Lemming to gamedisply */
        draw(gameDisplay, lem) {
            let ani = this.sprite[(lem.lookRight ? 1 : 0)];
            let frame = ani.getFrame(lem.frameIndex);
            gameDisplay.drawFrame(frame, lem.x, lem.y);
        }
        process(level, lem) {
            lem.frameIndex++;
            if (lem.frameIndex <= 4) {
                lem.y -= 2;
                return Lemmings.LemmingStateType.NO_STATE_TYPE;
            }
            if (lem.frameIndex >= 8) {
                return Lemmings.LemmingStateType.WALKING;
                ;
            }
            return Lemmings.LemmingStateType.NO_STATE_TYPE;
        }
    }
    Lemmings.ActionHoistSystem = ActionHoistSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionJumpSystem {
        constructor(sprites) {
            this.soundSystem = new Lemmings.SoundSystem();
            this.sprite = [];
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.FALLING, false));
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.FALLING, true));
        }
        getActionName() {
            return "jump";
        }
        triggerLemAction(lem) {
            return false;
        }
        draw(gameDisplay, lem) {
            let ani = this.sprite[(lem.lookRight ? 1 : 0)];
            let frame = ani.getFrame(lem.frameIndex);
            gameDisplay.drawFrame(frame, lem.x, lem.y);
        }
        process(level, lem) {
            lem.frameIndex++;
            let i = 0;
            for (; i < 2; i++) {
                if (!level.hasGroundAt(lem.x, lem.y + i - 1)) {
                    break;
                }
            }
            lem.y -= i;
            if (i < 2) {
                return Lemmings.LemmingStateType.WALKING;
            }
            return Lemmings.LemmingStateType.NO_STATE_TYPE; // this.check_top_collision(lem);
        }
    }
    Lemmings.ActionJumpSystem = ActionJumpSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionMineSystem {
        constructor(sprites, masks) {
            this.soundSystem = new Lemmings.SoundSystem();
            this.sprite = [];
            this.masks = [];
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.MINEING, false));
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.MINEING, true));
            this.masks.push(masks.GetMask(Lemmings.MaskTypes.MINEING_L));
            this.masks.push(masks.GetMask(Lemmings.MaskTypes.MINEING_R));
        }
        draw(gameDisplay, lem) {
            let ani = this.sprite[(lem.lookRight ? 1 : 0)];
            let frame = ani.getFrame(lem.frameIndex);
            gameDisplay.drawFrame(frame, lem.x, lem.y);
        }
        getActionName() {
            return "mining";
        }
        triggerLemAction(lem) {
            lem.setAction(this);
            return true;
        }
        process(level, lem) {
            lem.frameIndex = (lem.frameIndex + 1) % 24;
            switch (lem.frameIndex) {
                case 1:
                case 2:
                    let mask = this.masks[(lem.lookRight ? 1 : 0)];
                    let maskIndex = lem.frameIndex - 1;
                    level.clearGroundWithMask(mask.GetMask(maskIndex), lem.x, lem.y);
                    break;
                case 3:
                    lem.y++;
                case 15:
                    lem.x += lem.lookRight ? 1 : -1;
                    if (!level.hasGroundAt(lem.x, lem.y)) {
                        return Lemmings.LemmingStateType.FALLING;
                    }
                    break;
            }
            return Lemmings.LemmingStateType.NO_STATE_TYPE;
        }
    }
    Lemmings.ActionMineSystem = ActionMineSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionOhNoSystem {
        constructor(sprites) {
            this.soundSystem = new Lemmings.SoundSystem();
            this.sprite = sprites.getAnimation(Lemmings.SpriteTypes.OHNO, false);
        }
        getActionName() {
            return "oh-no";
        }
        triggerLemAction(lem) {
            return false;
        }
        /** render Lemming to gamedisply */
        draw(gameDisplay, lem) {
            let frame = this.sprite.getFrame(lem.frameIndex);
            gameDisplay.drawFrame(frame, lem.x, lem.y);
        }
        process(level, lem) {
            lem.frameIndex++;
            if (lem.frameIndex == 16) {
                // play sound: explosion
                return Lemmings.LemmingStateType.EXPLODING;
            }
            // fall down!
            for (let i = 0; i < 3; i++) {
                if (!level.hasGroundAt(lem.x, lem.y + 1)) {
                    lem.y++;
                    break;
                }
            }
            return Lemmings.LemmingStateType.NO_STATE_TYPE;
        }
    }
    Lemmings.ActionOhNoSystem = ActionOhNoSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionShrugSystem {
        constructor(sprites) {
            this.soundSystem = new Lemmings.SoundSystem();
            this.sprite = [];
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.SHRUGGING, false));
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.SHRUGGING, true));
        }
        getActionName() {
            return "shruging";
        }
        triggerLemAction(lem) {
            return false;
        }
        /** render Lemming to gamedisply */
        draw(gameDisplay, lem) {
            let ani = this.sprite[(lem.lookRight ? 1 : 0)];
            let frame = ani.getFrame(lem.frameIndex);
            gameDisplay.drawFrame(frame, lem.x, lem.y);
        }
        process(level, lem) {
            lem.frameIndex++;
            if (lem.frameIndex >= 8) {
                return Lemmings.LemmingStateType.WALKING;
            }
            return Lemmings.LemmingStateType.NO_STATE_TYPE;
        }
    }
    Lemmings.ActionShrugSystem = ActionShrugSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionSplatterSystem {
        constructor(sprites) {
            this.soundSystem = new Lemmings.SoundSystem();
            this.sprite = sprites.getAnimation(Lemmings.SpriteTypes.SPLATTING, false);
        }
        getActionName() {
            return "splatter";
        }
        triggerLemAction(lem) {
            return false;
        }
        draw(gameDisplay, lem) {
            let frame = this.sprite.getFrame(lem.frameIndex);
            gameDisplay.drawFrame(frame, lem.x, lem.y);
        }
        process(level, lem) {
            lem.disable();
            lem.frameIndex++;
            if (lem.frameIndex >= 16) {
                return Lemmings.LemmingStateType.OUT_OFF_LEVEL;
            }
            return Lemmings.LemmingStateType.NO_STATE_TYPE;
        }
    }
    Lemmings.ActionSplatterSystem = ActionSplatterSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ActionWalkSystem {
        constructor(sprites) {
            this.sprite = [];
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.WALKING, false));
            this.sprite.push(sprites.getAnimation(Lemmings.SpriteTypes.WALKING, true));
        }
        draw(gameDisplay, lem) {
            let ani = this.sprite[(lem.lookRight ? 1 : 0)];
            let frame = ani.getFrame(lem.frameIndex);
            gameDisplay.drawFrame(frame, lem.x, lem.y);
        }
        getActionName() {
            return "walk";
        }
        triggerLemAction(lem) {
            return false;
        }
        getGroundStepDelta(groundMask, x, y) {
            for (let i = 0; i < 8; i++) {
                if (!groundMask.hasGroundAt(x, y - i)) {
                    return i;
                }
            }
            return 8;
        }
        getGroudGapDelta(groundMask, x, y) {
            for (let i = 1; i < 4; i++) {
                if (groundMask.hasGroundAt(x, y + i)) {
                    return i;
                }
            }
            return 4;
        }
        process(level, lem) {
            lem.frameIndex++;
            lem.x += (lem.lookRight ? 1 : -1);
            let groundMask = level.getGroundMaskLayer();
            let upDelta = this.getGroundStepDelta(groundMask, lem.x, lem.y);
            if (upDelta == 8) {
                // collision with obstacle
                if (lem.canClimb) {
                    // start climbing
                    return Lemmings.LemmingStateType.CLIMBING;
                }
                else {
                    // turn around
                    lem.lookRight = !lem.lookRight;
                    return Lemmings.LemmingStateType.NO_STATE_TYPE;
                }
            }
            else if (upDelta > 0) {
                lem.y -= upDelta - 1;
                if (upDelta > 3) {
                    // jump
                    return Lemmings.LemmingStateType.JUMPING;
                }
                else {
                    // walk with small jump up
                    return Lemmings.LemmingStateType.NO_STATE_TYPE;
                }
            }
            else {
                // walk or fall
                let downDelta = this.getGroudGapDelta(groundMask, lem.x, lem.y);
                lem.y += downDelta;
                if (downDelta == 4) {
                    return Lemmings.LemmingStateType.FALLING;
                }
                else {
                    // walk with small jump down
                    return Lemmings.LemmingStateType.NO_STATE_TYPE;
                }
            }
        }
    }
    Lemmings.ActionWalkSystem = ActionWalkSystem;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** Commands actions on lemmings the user has given */
    class CommandLemmingsAction {
        constructor(lemmingId) {
            this.log = new Lemmings.LogHandler("CommandLemmingsAction");
            if (lemmingId != null)
                this.lemmingId = lemmingId;
        }
        getCommandKey() {
            return "l";
        }
        /** load parameters for this command from serializer */
        load(values) {
            if (values.length < 1) {
                this.log.log("Unable to process load");
                return;
            }
            this.lemmingId = values[0];
        }
        /** save parameters of this command to serializer */
        save() {
            return [this.lemmingId];
        }
        /** execute this command */
        execute(game) {
            let lemManager = game.getLemmingManager();
            let lem = lemManager.getLemming(this.lemmingId);
            if (!lem) {
                this.log.log("Lemming not found! " + this.lemmingId);
                return false;
            }
            let skills = game.getGameSkills();
            let selectedSkill = skills.getSelectedSkill();
            if (!skills.canReduseSkill(selectedSkill)) {
                this.log.log("Not enough skills!");
                return false;
            }
            /// set the skill
            if (!lemManager.doLemmingAction(lem, selectedSkill)) {
                this.log.log("unable to execute action on lemming!");
                return false;
            }
            /// reduce the available skill count
            return skills.reduseSkill(selectedSkill);
        }
    }
    Lemmings.CommandLemmingsAction = CommandLemmingsAction;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** manages commands user -> game */
    class CommandManager {
        constructor(game, gameTimer) {
            this.game = game;
            this.gameTimer = gameTimer;
            this.log = new Lemmings.LogHandler("CommandManager");
            this.runCommands = {};
            this.loggedCommads = {};
            this.gameTimer.onBeforeGameTick.on((tick) => {
                let command = this.runCommands[tick];
                if (!command)
                    return;
                this.queueCommand(command);
            });
        }
        /** load parameters for this command from serializer */
        loadReplay(replayString) {
            let parts = replayString.split("&");
            for (let i = 0; i < parts.length; i++) {
                let commandStr = parts[i].split("=", 2);
                if (commandStr.length != 2)
                    continue;
                let tick = (+commandStr[0]) | 0;
                this.runCommands[tick] = this.parseCommand(commandStr[1]);
            }
        }
        commandFactory(type) {
            switch (type.toLowerCase()) {
                case "l":
                    return new Lemmings.CommandLemmingsAction();
                case "n":
                    return new Lemmings.CommandNuke();
                case "s":
                    return new Lemmings.CommandSelectSkill();
                case "i":
                    return new Lemmings.CommandReleaseRateIncrease();
                case "d":
                    return new Lemmings.CommandReleaseRateDecrease();
                default:
                    return null;
            }
        }
        parseCommand(valuesStr) {
            if (valuesStr.length < 1)
                return;
            let newCommand = this.commandFactory(valuesStr.substr(0, 1));
            let values = valuesStr.substr(1).split(":");
            newCommand.load(values.map(Number));
            return newCommand;
        }
        /** add a command to execute queue */
        queueCommand(newCommand) {
            let currentTick = this.gameTimer.getGameTicks();
            if (newCommand.execute(this.game)) {
                // only log commands that are executable
                this.loggedCommads[currentTick] = newCommand;
            }
        }
        serialize() {
            let result = [];
            Object.keys(this.loggedCommads).forEach((key) => {
                let command = this.loggedCommads[+key];
                result.push(key + "=" + command.getCommandKey() + command.save().join(":"));
            });
            return result.join("&");
        }
    }
    Lemmings.CommandManager = CommandManager;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** Commands a all lemmings nuke */
    class CommandNuke {
        constructor() {
            this.log = new Lemmings.LogHandler("CommandNuke");
        }
        getCommandKey() {
            return "n";
        }
        /** load parameters for this command from serializer */
        load(values) {
        }
        /** save parameters of this command to serializer */
        save() {
            return [];
        }
        /** execute this command */
        execute(game) {
            let lemManager = game.getLemmingManager();
            if (lemManager.isNuking())
                return false;
            lemManager.doNukeAllLemmings();
            game.getVictoryCondition().doNuke();
            return true;
        }
    }
    Lemmings.CommandNuke = CommandNuke;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** Increase the release rate */
    class CommandReleaseRateDecrease {
        constructor(number) {
            this.log = new Lemmings.LogHandler("CommandReleaseRateDecrease");
            if (number != null)
                this.number = number;
        }
        getCommandKey() {
            return "d";
        }
        /** load parameters for this command from serializer */
        load(values) {
            if (values.length < 1) {
                this.log.log("Unable to process load");
                return;
            }
            this.number = values[0];
        }
        /** save parameters of this command to serializer */
        save() {
            return [this.number];
        }
        /** execute this command */
        execute(game) {
            let victoryConditions = game.getVictoryCondition();
            return victoryConditions.changeReleaseRate(-this.number);
        }
    }
    Lemmings.CommandReleaseRateDecrease = CommandReleaseRateDecrease;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** Increase the release rate */
    class CommandReleaseRateIncrease {
        constructor(number) {
            this.log = new Lemmings.LogHandler("CommandReleaseRateIncrease");
            if (number != null)
                this.number = number;
        }
        getCommandKey() {
            return "i";
        }
        /** load parameters for this command from serializer */
        load(values) {
            if (values.length < 1) {
                this.log.log("Unable to process load");
                return;
            }
            this.number = values[0];
        }
        /** save parameters of this command to serializer */
        save() {
            return [this.number];
        }
        /** execute this command */
        execute(game) {
            let victoryConditions = game.getVictoryCondition();
            return victoryConditions.changeReleaseRate(this.number);
        }
    }
    Lemmings.CommandReleaseRateIncrease = CommandReleaseRateIncrease;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** Commands actions on lemmings the user has given */
    class CommandSelectSkill {
        constructor(skill) {
            this.log = new Lemmings.LogHandler("CommandSelectSkill");
            if (skill)
                this.skill = skill;
        }
        getCommandKey() {
            return "s";
        }
        /** load parameters for this command from serializer */
        load(values) {
            if (values.length < 0) {
                this.log.log("Unable to process load");
                return;
            }
            this.skill = values[0];
        }
        /** save parameters of this command to serializer */
        save() {
            return [+(this.skill)];
        }
        /** execute this command */
        execute(game) {
            let gameSkill = game.getGameSkills();
            return gameSkill.setSelectedSkill(this.skill);
        }
    }
    Lemmings.CommandSelectSkill = CommandSelectSkill;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class Animation {
        constructor() {
            this.frames = [];
            this.isRepeat = true;
            this.firstFrameIndex = 0;
        }
        getFrame(frameIndex) {
            frameIndex = frameIndex + this.firstFrameIndex;
            let frame = 0;
            if (this.isRepeat) {
                frame = frameIndex % this.frames.length;
            }
            else {
                if (frameIndex < this.frames.length)
                    frame = frameIndex;
            }
            return this.frames[frame];
        }
        /** load all images for this animation from a file */
        loadFromFile(fr, bitsPerPixle, width, height, frames, palette, offsetX = null, offsetY = null) {
            for (let f = 0; f < frames; f++) {
                let paletteImg = new Lemmings.PaletteImage(width, height);
                paletteImg.processImage(fr, bitsPerPixle);
                paletteImg.processTransparentByColorIndex(0);
                this.frames.push(paletteImg.createFrame(palette, offsetX, offsetY));
            }
        }
    }
    Lemmings.Animation = Animation;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** defines the way a image is drawn to the stage */
    class DrawProperties {
        constructor(isUpsideDown, noOverwrite, onlyOverwrite, isErase) {
            this.isUpsideDown = isUpsideDown;
            this.noOverwrite = noOverwrite;
            this.onlyOverwrite = onlyOverwrite;
            this.isErase = isErase;
            //- the original game does not allow the combination: (noOverwrite | isErase)
            if (noOverwrite)
                this.isErase = false;
        }
    }
    Lemmings.DrawProperties = DrawProperties;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** image frame with index color */
    class Frame {
        constructor(width, height, offsetX, offsetY) {
            this.width = 0;
            this.height = 0;
            this.offsetX = 0;
            this.offsetY = 0;
            this.width = Math.trunc(width);
            this.height = Math.trunc(height);
            if (offsetX == null) {
                this.offsetX = 0;
            }
            else {
                this.offsetX = Math.trunc(offsetX);
            }
            if (offsetY == null) {
                this.offsetY = 0;
            }
            else {
                this.offsetY = Math.trunc(offsetY);
            }
            let pixCount = this.width * this.height;
            this.data = new Uint32Array(pixCount);
            this.mask = new Int8Array(pixCount);
            this.clear();
        }
        getData() {
            return new Uint8ClampedArray(this.data.buffer);
        }
        getBuffer() {
            return this.data;
        }
        /** Mask can be 0 or 1 */
        getMask() {
            return this.mask;
        }
        /** set the image to color=black / alpha=255 / mask=0 */
        clear() {
            //this.data.fill(ColorPalette.debugColor());
            this.data.fill(Lemmings.ColorPalette.black);
            this.mask.fill(0);
        }
        /** set the image to color=black / alpha=255 / mask=0 */
        fill(r, g, b) {
            this.data.fill(Lemmings.ColorPalette.colorFromRGB(r, g, b));
            this.mask.fill(1);
        }
        /** draw a palette Image to this frame */
        drawPaletteImage(srcImg, srcWidth, srcHeight, palette, left, top) {
            let pixIndex = 0;
            srcWidth = srcWidth | 0;
            srcHeight = srcHeight | 0;
            left = left | 0;
            top = top | 0;
            for (let y = 0; y < srcHeight; y++) {
                for (let x = 0; x < srcWidth; x++) {
                    let colorIndex = srcImg[pixIndex];
                    pixIndex++;
                    if ((colorIndex & 0x80) > 0) {
                        this.clearPixel(x + left, y + top);
                    }
                    else {
                        this.setPixel(x + left, y + top, palette.getColor(colorIndex));
                    }
                }
            }
        }
        /** set the color of a pixle */
        setPixel(x, y, color, noOverwrite = false, onlyOverwrite = false) {
            if ((x < 0) || (x >= this.width))
                return;
            if ((y < 0) || (y >= this.height))
                return;
            let destPixelPos = y * this.width + x;
            if (noOverwrite) {
                /// if some data have been drawn here before
                if (this.mask[destPixelPos] != 0)
                    return;
            }
            if (onlyOverwrite) {
                /// if no data have been drawn here before
                if (this.mask[destPixelPos] == 0)
                    return;
            }
            this.data[destPixelPos] = color;
            this.mask[destPixelPos] = 1;
        }
        /** set a pixle to back */
        clearPixel(x, y) {
            if ((x < 0) || (x >= this.width))
                return;
            if ((y < 0) || (y >= this.height))
                return;
            let destPixelPos = y * this.width + x;
            this.data[destPixelPos] = Lemmings.ColorPalette.black;
            this.mask[destPixelPos] = 0;
        }
    }
    Lemmings.Frame = Frame;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** uses the LevelReader and GroundReader to render/create the games background */
    class GroundRenderer {
        constructor() {
        }
        createVgaspecMap(lr, vr) {
            this.img = vr.img;
        }
        /** create the ground image from the level definition and the Terrain images */
        createGroundMap(lr, terrarImg) {
            this.img = new Lemmings.Frame(lr.levelWidth, lr.levelHeight);
            let terrarObjects = lr.terrains;
            for (let i = 0; i < terrarObjects.length; i++) {
                let tOb = terrarObjects[i];
                this.copyImageTo(terrarImg[tOb.id], tOb);
            }
        }
        /** copy a terrain image to the ground */
        copyImageTo(srcImg, destConfig, frameIndex = 0) {
            if (!srcImg)
                return;
            var pixBuf = srcImg.frames[frameIndex];
            var w = srcImg.width;
            var h = srcImg.height;
            var pal = srcImg.palette;
            var destX = destConfig.x;
            var destY = destConfig.y;
            var upsideDown = destConfig.drawProperties.isUpsideDown;
            var noOverwrite = destConfig.drawProperties.noOverwrite;
            var isErase = destConfig.drawProperties.isErase;
            var onlyOverwrite = destConfig.drawProperties.onlyOverwrite;
            for (var y = 0; y < h; y++) {
                for (var x = 0; x < w; x++) {
                    let sourceY = upsideDown ? (h - y - 1) : y;
                    /// read source color index
                    let colorIndex = pixBuf[sourceY * w + x];
                    /// ignore transparent pixels
                    if ((colorIndex & 0x80) != 0)
                        continue;
                    if (isErase) {
                        this.img.clearPixel(x + destX, y + destY);
                    }
                    else {
                        this.img.setPixel(x + destX, y + destY, pal.getColor(colorIndex), noOverwrite, onlyOverwrite);
                    }
                }
            }
        }
    }
    Lemmings.GroundRenderer = GroundRenderer;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class LevelIndexType {
        constructor() {
            /** use the odd table information for this entry */
            this.useOddTable = false;
        }
    }
    Lemmings.LevelIndexType = LevelIndexType;
    /** matches the Level-Mode + Level-Index to a level-file and level-file-index */
    class LevelIndexResolve {
        constructor(config) {
            this.config = config;
        }
        resolve(levelMode, levelIndex) {
            let levelOrderList = this.config.level.order;
            if (levelOrderList.length <= levelMode)
                return null;
            if (levelMode < 0)
                return null;
            let levelOrder = levelOrderList[levelMode];
            if (levelOrder.length <= levelIndex)
                return null;
            if (levelIndex < 0)
                return null;
            let levelOrderConfig = levelOrder[levelIndex];
            let liType = new LevelIndexType();
            liType.fileId = Math.abs((levelOrderConfig / 10) | 0);
            liType.partIndex = Math.abs((levelOrderConfig % 10) | 0);
            liType.useOddTable = (levelOrderConfig < 0);
            /// the level number is the sum-index of the level
            let levelNo = 0;
            for (let i = 0; i < (levelMode - 1); i++) {
                levelNo += levelOrderList[i].length;
            }
            liType.levelNumber = levelNo + levelIndex;
            return liType;
        }
    }
    Lemmings.LevelIndexResolve = LevelIndexResolve;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** Bootstrap the Level loading */
    class LevelLoader {
        constructor(fileProvider, config) {
            this.fileProvider = fileProvider;
            this.config = config;
            this.levelIndexResolve = new Lemmings.LevelIndexResolve(config);
        }
        /** return the map and it's config */
        getLevel(levelMode, levelIndex) {
            let level;
            let levelReader;
            return new Promise((resolve, reject) => {
                let levelInfo = this.levelIndexResolve.resolve(levelMode, levelIndex);
                if (levelInfo == null) {
                    resolve(null);
                    return;
                }
                let useOddTable = levelInfo.useOddTable && this.config.level.useOddTable;
                let promiseList = [];
                let paddedFileId = ("0000" + levelInfo.fileId).slice(-3);
                promiseList.push(this.fileProvider.loadBinary(this.config.path, this.config.level.filePrefix + paddedFileId + ".DAT"));
                /// may we need to load the odd-table to?
                if (useOddTable) {
                    promiseList.push(this.fileProvider.loadBinary(this.config.path, "ODDTABLE.DAT"));
                }
                Promise.all(promiseList)
                    .then(files => {
                    /// read the level meta data
                    let levelsContainer = new Lemmings.FileContainer(files[0]);
                    levelReader = new Lemmings.LevelReader(levelsContainer.getPart(levelInfo.partIndex));
                    level = new Lemmings.Level(levelReader.levelWidth, levelReader.levelHeight);
                    level.gameType = this.config.gametype;
                    level.levelIndex = levelIndex;
                    level.levelMode = levelMode;
                    level.screenPositionX = levelReader.screenPositionX;
                    level.isSuperLemming = levelReader.isSuperLemming;
                    /// default level properties
                    let levelProperties = levelReader.levelProperties;
                    /// switch level properties to odd table config
                    if (useOddTable) {
                        let oddTable = new Lemmings.OddTableReader(files[1]);
                        levelProperties = oddTable.getLevelProperties(levelInfo.levelNumber);
                    }
                    level.name = levelProperties.levelName;
                    level.releaseRate = levelProperties.releaseRate;
                    level.releaseCount = levelProperties.releaseCount;
                    level.needCount = levelProperties.needCount;
                    level.timeLimit = levelProperties.timeLimit;
                    level.skills = levelProperties.skills;
                    let fileList = [];
                    /// load level ground
                    fileList.push(this.fileProvider.loadBinary(this.config.path, "VGAGR" + levelReader.graphicSet1 + ".DAT"));
                    fileList.push(this.fileProvider.loadBinary(this.config.path, "GROUND" + levelReader.graphicSet1 + "O.DAT"));
                    if (levelReader.graphicSet2 != 0) {
                        /// this is a Image Map
                        fileList.push(this.fileProvider.loadBinary(this.config.path, "VGASPEC" + (levelReader.graphicSet2 - 1) + ".DAT"));
                    }
                    return Promise.all(fileList);
                })
                    .then((fileList) => {
                    let goundFile = fileList[1];
                    let vgaContainer = new Lemmings.FileContainer(fileList[0]);
                    /// read the images used for the map and for the objects of the map
                    let groundReader = new Lemmings.GroundReader(goundFile, vgaContainer.getPart(0), vgaContainer.getPart(1));
                    /// render the map background image
                    let render = new Lemmings.GroundRenderer();
                    if (fileList.length > 2) {
                        /// use a image for this map background
                        let vgaspecReader = new Lemmings.VgaspecReader(fileList[2], level.width, level.height);
                        render.createVgaspecMap(levelReader, vgaspecReader);
                    }
                    else {
                        /// this is a normal map background
                        render.createGroundMap(levelReader, groundReader.getTerraImages());
                    }
                    level.setGroundImage(render.img.getData());
                    level.setGroundMaskLayer(new Lemmings.SolidLayer(level.width, level.height, render.img.mask));
                    level.setMapObjects(levelReader.objects, groundReader.getObjectImages());
                    level.setPalettes(groundReader.colorPalette, groundReader.groundPalette);
                    resolve(level);
                });
            });
        }
    }
    Lemmings.LevelLoader = LevelLoader;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** Level Data */
    class Level {
        constructor(width, height) {
            /** the background mask 0=noGround / 1=ground*/
            this.groundMask = null;
            /** objects on the map: entrance/exit/traps */
            this.objects = [];
            this.entrances = [];
            this.triggers = [];
            this.name = "";
            this.width = 0;
            this.height = 0;
            this.releaseRate = 0;
            this.releaseCount = 0;
            this.needCount = 0;
            this.timeLimit = 0;
            this.skills = new Array(Lemmings.SkillTypes.length());
            this.screenPositionX = 0;
            this.isSuperLemming = false;
            this.width = width;
            this.height = height;
        }
        /** set the map objects of this level and update trigger */
        setMapObjects(objects, objectImg) {
            this.entrances = [];
            this.triggers = [];
            this.objects = [];
            /// process all objects
            for (let i = 0; i < objects.length; i++) {
                let ob = objects[i];
                let objectInfo = objectImg[ob.id];
                /// add object
                let newMapObject = new Lemmings.MapObject(ob, objectInfo);
                this.objects.push(newMapObject);
                /// add entrances
                if (ob.id == 1)
                    this.entrances.push(ob);
                /// add triggers
                if (objectInfo.trigger_effect_id != 0) {
                    let x1 = ob.x + objectInfo.trigger_left;
                    let y1 = ob.y + objectInfo.trigger_top;
                    let x2 = x1 + objectInfo.trigger_width;
                    let y2 = y1 + objectInfo.trigger_height;
                    let newTrigger = new Lemmings.Trigger(objectInfo.trigger_effect_id, x1, y1, x2, y2, 0, objectInfo.trap_sound_effect_id);
                    this.triggers.push(newTrigger);
                }
            }
        }
        /** check if a y-position is out of the level */
        isOutOfLevel(y) {
            return ((y >= this.height) || (y <= 0));
        }
        /** return the layer that defines if a pixel in the level is solid */
        getGroundMaskLayer() {
            if (this.groundMask == null) {
                this.groundMask = new Lemmings.SolidLayer(this.width, this.height);
            }
            return this.groundMask;
        }
        /** set the GroundMaskLayer */
        setGroundMaskLayer(solidLayer) {
            this.groundMask = solidLayer;
        }
        /** clear with mask  */
        clearGroundWithMask(mask, x, y) {
            x += mask.offsetX;
            y += mask.offsetY;
            for (let d_y = 0; d_y < mask.height; d_y++) {
                for (let d_x = 0; d_x < mask.width; d_x++) {
                    if (!mask.at(d_x, d_y)) {
                        this.clearGroundAt(x + d_x, y + d_y);
                    }
                }
            }
        }
        /** set a point in the map to solid ground  */
        setGroundAt(x, y, palletIndex) {
            this.groundMask.setGroundAt(x, y);
            let index = (y * this.width + x) * 4;
            this.groundImage[index + 0] = this.colorPalette.getR(palletIndex);
            this.groundImage[index + 1] = this.colorPalette.getG(palletIndex);
            this.groundImage[index + 2] = this.colorPalette.getB(palletIndex);
        }
        /** checks if a point is solid ground  */
        hasGroundAt(x, y) {
            return this.groundMask.hasGroundAt(x, y);
        }
        /** clear a point  */
        clearGroundAt(x, y) {
            this.groundMask.clearGroundAt(x, y);
            let index = (y * this.width + x) * 4;
            this.groundImage[index + 0] = 0; // R
            this.groundImage[index + 1] = 0; // G
            this.groundImage[index + 2] = 0; // B
        }
        setGroundImage(img) {
            this.groundImage = new Uint8ClampedArray(img);
        }
        /** set the color palettes for this level */
        setPalettes(colorPalette, groundPalette) {
            this.colorPalette = colorPalette;
            this.groundPalette = groundPalette;
        }
        /** render ground to display */
        render(gameDisplay) {
            gameDisplay.initSize(this.width, this.height);
            gameDisplay.setBackground(this.groundImage, this.groundMask);
        }
    }
    Lemmings.Level = Level;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** a mask */
    class MaskList {
        constructor(fr, width, height, count, offsetX, offsetY) {
            if (fr != null) {
                this.loadFromFile(fr, width, height, count, offsetX, offsetY);
            }
        }
        get lenght() {
            return frames.length;
        }
        GetMask(index) {
            return this.frames[index];
        }
        loadFromFile(fr, width, height, count, offsetX, offsetY) {
            this.frames = [];
            for (let i = 0; i < count; i++) {
                let mask = new Lemmings.Mask(fr, width, height, offsetX, offsetY);
                this.frames.push(mask);
            }
        }
    }
    Lemmings.MaskList = MaskList;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** manage the in-game masks a lemming can use to change the map */
    class MaskProvider {
        constructor(fr) {
            this.maskList = [];
            this.maskList[Lemmings.MaskTypes.BASHING_R] = new Lemmings.MaskList(fr, 16, 10, 4, -8, -10);
            this.maskList[Lemmings.MaskTypes.BASHING_L] = new Lemmings.MaskList(fr, 16, 10, 4, -8, -10);
            this.maskList[Lemmings.MaskTypes.MINEING_R] = new Lemmings.MaskList(fr, 16, 13, 2, -8, -12);
            this.maskList[Lemmings.MaskTypes.MINEING_L] = new Lemmings.MaskList(fr, 16, 13, 2, -8, -12);
            this.maskList[Lemmings.MaskTypes.EXPLODING] = new Lemmings.MaskList(fr, 16, 22, 1, -8, -14);
            this.maskList[Lemmings.MaskTypes.NUMBERS] = new Lemmings.MaskList(fr, 8, 8, 10, -1, -19);
        }
        GetMask(maskTypes) {
            return this.maskList[maskTypes];
        }
    }
    Lemmings.MaskProvider = MaskProvider;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    var MaskTypes;
    (function (MaskTypes) {
        MaskTypes[MaskTypes["BASHING_R"] = 0] = "BASHING_R";
        MaskTypes[MaskTypes["BASHING_L"] = 1] = "BASHING_L";
        MaskTypes[MaskTypes["MINEING_R"] = 2] = "MINEING_R";
        MaskTypes[MaskTypes["MINEING_L"] = 3] = "MINEING_L";
        MaskTypes[MaskTypes["EXPLODING"] = 4] = "EXPLODING";
        MaskTypes[MaskTypes["NUMBERS"] = 5] = "NUMBERS";
    })(MaskTypes = Lemmings.MaskTypes || (Lemmings.MaskTypes = {}));
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** a mask */
    class Mask {
        constructor(fr, width, height, offsetX, offsetY) {
            this.offsetX = offsetX;
            this.offsetY = offsetY;
            if (fr != null) {
                this.loadFromFile(fr, width, height);
            }
        }
        getMask() {
            return this.data;
        }
        /** return true if the given position (x,y) of the mask is set */
        at(x, y) {
            return (this.data[y * this.width + x] == 0);
        }
        /** load a mask from a file stream */
        loadFromFile(fr, width, height) {
            this.width = width;
            this.height = height;
            let pixCount = width * height;
            let pixBuf = new Int8Array(pixCount);
            let bitBuffer = 0;
            let bitBufferLen = 0;
            for (let i = 0; i < pixCount; i++) {
                if (bitBufferLen <= 0) {
                    bitBuffer = fr.readByte();
                    bitBufferLen = 8;
                }
                pixBuf[i] = (bitBuffer & 0x80);
                bitBuffer = (bitBuffer << 1);
                bitBufferLen--;
            }
            this.data = pixBuf;
        }
    }
    Lemmings.Mask = Mask;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class ParticleTable {
        constructor(palette) {
            this.palette = palette;
            this.colorIndexTable = [4, 15, 14, 13, 12, 11, 10, 9, 8, 11, 10, 9, 8, 7, 6, 2];
            /// read particle coordinats form Base64 string
            this.particleData = new Array(51);
            let data = window.atob(ParticleTable.particleDataBase64);
            let pos = 0;
            for (let f = 0; f < 51; f++) {
                this.particleData[f] = new Int8Array(160);
                let tmpData = this.particleData[f];
                for (let p = 0; p < 80; p++) {
                    /// x position
                    tmpData[p * 2] = data.charCodeAt(pos);
                    pos++;
                    /// y position
                    tmpData[p * 2 + 1] = data.charCodeAt(pos);
                    pos++;
                }
            }
        }
        draw(gameDisplay, frameIndex, x, y) {
            var frameData = this.particleData[frameIndex];
            if ((!frameData) || (gameDisplay == null)) {
                return;
            }
            for (let i = 0; i < frameData.length; i += 2) {
                let dx = frameData[i];
                let dy = frameData[i + 1];
                if ((dx == -128) || (dy == -128)) {
                    continue;
                }
                let colorIndex = this.colorIndexTable[i % 16];
                gameDisplay.setPixel(x + dx, y + dy, this.palette.getR(colorIndex), this.palette.getG(colorIndex), this.palette.getB(colorIndex));
            }
        }
    }
    ParticleTable.particleDataBase64 = "zJzp0Qfn/usD8vj1/PgD+fr6A/j+8/j3//b6/fv1Afz++vr2Av4F+AL5+fn7/wL4Afv++/r6AgH/AAD4BAD+/P4AA/gF/wD6/fr9+QMA/PsF+wQAAAL+AQH7/AL/Av7/BP39+fz+Af78+vz8+/sB/gP/AAABAAMAA/4A/f4C//0D///+/QL/A/78A/sA/v39/wH7/QL9AgH/Af7+Afv/AYCA0aMPy/zUBOL16PntCe728gnu+ev28Pzw+Pb48AT3//T48gH5B/MC9ff2+PwC9AP4Afj3+AH+//0B9QX+/vr+/QX2Bf0C9/v3/fYC/v35BvkF/wEA//" +
        "8C+v0B/gH+/QX7/fj8/QH8+/j7+vv6Af0D/QD+Af8D/gP9Afv+Af77Af7//f0BAAL++wP6Af3+/P8A+vwB/AIA/wD9/QL6AACAgICAF7D6vQXS8tz24Q/k8+oO5PTj8+n46vbv9uoH8gDv9+4B9AnvAfH28vb5A/AF9QP29fUA/P/7A/MG/P/3/fsG8wX7BPX69f30Avz99wb3B/0D/gD9BPj9//0A//sH+v32/PsC+/v3+vn6+QD8BPwA/QH+A/0D/AL6/v/++wD9APz8AAAB/foD+QH8//v///r7AfsC//8A/f0C+QAAgICAgB6V+aYFwu/Q9NYV" +
        "2e/iE9vw2/Di9eXz6fTlCu0B6vbqAPAL6gHu9O/z9gPtB/IF8/Pz/voA+QTwBvoA9f35B/EF+Qb0+PP98gH6/vYH9Qj7BPwB/AX3/v77///6CPn99fz6Avr69vn4+vgA+wX7AfwB/QP9BPsD+v7+/vr//QD7+/8BAP36A/gC+//6//75+wD7A/4A//z8A/kA/4CAgICAgPeQBrPsxPHLG8/s2hjS69Tt3PLf8eLx4A7pAuX05v/rDeYB6/Ps8fMD6gnwCPHx8f34APcF7gf4AfP9+AnvBfgH8vfx/fAB+f/0CPQK+gb7AvsH9v79+v4A+Qr4/fT7+Q" +
        "L5+vX49/n3APoG+wH7AfwC/AT6BPn//v35/vwA+/v/AQD9+QP4AvsA+v/++fr/+wP+AP/8/AT5AP+AgICAgICAgAak6bnuwCHG6dMdyebM69bv2u7c79wR5ATg8+L+5xDiAefx6u7xA+cL7Qrv7+/89gD2BuwI9gLy/PYK7gX2CfD17/3vAPj/8wjzC/kH+QP5Cfb//fn9APgL9/30+/kC+Pn09/b49//5B/oB+wL8AvwE+gX5//39+f38Afv6/wIA/PkD+AP7Afr+/vj6//oD/gD/+/sE+QH/gICAgICAgIAHleau7LYnvOXLIsDhxejQ7NXs1u3X" +
        "FOAF3PLf/uMS3gDk8Ofr7gTkDesM7e3u+vUB9AjqCPUD8Pz1C+wF9Qvv8+797QD2APIJ8g34CPgE+Qr1//z4/QD3Dfb98/v4A/j58/b2+Pf/+Qf6AvoC+wL7BfkG+P/9/fn8+wH7+f8CAPz4A/gE+wL6/v74+v76A/4B//r7BfkB/4CAgICAgICACIbjo+mrLbLixCe33b7lyunQ6dHq0xfcBtfx3P3fFNsA4u7l6ewE4Q/pDuzq7fnzAfMJ6AnzBO/79A3rBvQN7vLt/ez/9gHyCvEO+Ar3BfgM9f/89vwB9w72/fP7+AP3+PP19ff3//kI+gL6Av" +
        "sC+wX5B/j//fz5+/sB+/n/AwD8+AP4BPsD+v7++Pr9+wP+Af/6+wX5AQCAgICAgICAgICA4JjmoTOp3r0sr9i44sXmy+fL6M8b2AfT79n83BbYAN/t4+bqBN8R5xHq6Ov48gHyCucK8gXu+/MO6gbzD+3w7Pzr//UC8QrwD/cL9wb3DfUA/PX8AfYQ9v3z+vgD9/fz9PX39/75CfoC+gL7AvwF+Qj5AP38+fn8Avv4AAMA+/kD+AX7BPr+/vf7/fsD/gEA+fwG+gEAgICAgICAgICAgN2N5Jc5oNu3MafTseC/48bkxubLHtUIz+7W+9kY1ADd6+Hk" +
        "6QXcE+YT6ebq9vEB8QvmCvEG7fvyD+kG8hHt7+v86v70AvEL8BH3DPYH9w/1APz0/AL2Efb+8/r4A/f38/P19vf++Qr6A/oC/AL8BvoJ+QD9/Pn4/AL8+AAEAfv5A/kF/AX7/v/3+/z8A/4BAPj8BvsCAYCAgICAgICAgIDaguGNP5fXsDefzqvdut/C4sHjxyHSCsvt0/rVGtH/2+rf4ecF2hXkFejk6vXxAvEN5AvxB+z68hHoBvIS7O3q/Or+9APxDPAS9w72CfcQ9QH88v0C9hP2/vT6+AT39vPy9vb4/vkL+gP7AvwC/Qb6CvoA/fv69/0C/f" +
        "cBBAL7+gP6BvwG+/7/9vz7/QP/AgH4/Qf8AgKAgICAgICAgICAgIDehEWP1Ko8l8ml2rXcvt+84cQlzwvI69H60hzP/9no3t/mBdkX4xjn4un08ALwDuQM8Ajs+vES6AbxFOzr6vzp/fQE8QzwFPcP9gr3EvYB/fH9AvcU9v70+vkE+Pbz8fb1+P36DPsD+wP9Av4H+wv7Af77+/b9Av72AgUD+vsD+wf9Bvz+APb9+/4DAAIC9/4I/QIDgICAgICAgICAgICAgIBLhtCkQY/Fn9iw2brduN/BKMwMxerP+dAezP/X5tzc5QbXGeIa5+Dp8vAC8A/j" +
        "DfAJ7PnxE+gG8Rbs6ur86f30BPEN8BX3EfYL9xT3Af7w/gP3Fvf+9fn5BPn19PD39Pn9+wz8A/wD/gL/B/wM/AH/+/z1/wP/9gMFBPr8A/wH/gf+/gH1/vr/BAECBPf/CP4CBICAgICAgICAgICAgICAgIDNnkaIwJnVrNa227PcvivJDcHpzfjNIMr/1eXb2uQG1hvhHOfd6PHwAvAQ4g3wCuv58RXoB/IY7Ojp/On89AXyDfAW+BL2DPgV+AL/7v8D+Bf4/vb5+gX59fXv+PT6/PwN/QT9A/8CAAf9Df0BAPr99AADAPUFBgX6/QP+CAAI//4D9Q" +
        "D5AQQDAwX2AQkAAgaAgICAgICAgICAgICAgICAyZhLgbuU0qjTs9iv2rsuxg6+58v3yyPI/tTj2tfkBtQd4B/m2+jw8APwEeIO8Avs+fIW6AfyGuzn6vzp/PUG8w7xGPgT9w34F/kCAO0AA/kZ+f73+fsF+/T27vnz/Pz9Dv4E/gMAAgEI/g7+AQH6//MBAwL0BgcH+f4D/wgBCQD+BPUB+QIEBAMH9QIJAgMIgICAgICAgICAgICAgICAgMaTgIC2js+j0K/Wq9i4MsQQvObJ9sklxv7T4trV4wbTH+Ah5tnp7vAD8RPiD/EM7PjyF+gH8hzt5er8" +
        "6vv2BvQP8Rn5FfgO+Rj6AwHsAQT6Gvr++fn9Bfz09+368/38/g8ABAADAQEDCAAPAAIC+gDxAwQE9AgHCfkAAwEJAwoC/gb0A/gEBAYDCfUECgQDCoCAgICAgICAgICAgICAgIDCjoCAsonNn82s06fVtTXCEbnlyPbHJ8T+0uDZ0uMH0iHgI+fX6e3wA/IU4g/xDez48xnpB/Md7uTr/Or79gf1D/Ib+hb5D/oa/AMD6wME+xz7/vr4/gX98/jt+/L/+wAQAQUBAwMBBQgBEAICBPkC8AUEBvMKCAv5AgMDCgULBP4I9AX3BgQIAwv0BgsGAwyAgI" +
        "CAgICAgICAgICAgICAv4iAgK2EypzJqdGj07M4wBK348f1xSnC/tHf2dDjB9Ij4Cbn1ers8QTyFeMQ8g7t+PQa6Qf0H+/i6/zr+vgI9hD0HPwX+hD7G/0DBOkFBfwd/f78+AAG//P67P3yAfsCEAMFAwMFAQcJAxEEAgb5BO8HBAjyDQgN+AQDBQoHDAb9CvMH9wkECgQN9AgLCAMOgICAgICAgICAgICAgICAgLuEgICogMeYxqfOoNGxPL4TteLG9MQrwf3R3dnN4wfRJeAo6NPr6vIE8xbjEfMP7vf1G+oH9SHw4Oz87Pr5CfgR9R79GfsR/R3/" +
        "BAboBwX+H//+/vgCBgHy/Ov/8QP7BBEFBQUEBwEJCQUSBgII+QbuCQUK8g8JD/gGAwgLCQ0J/QzzCvYLBAwEEPMLDAsEEYCAgICAgICAgICAgICAgICAgICAgIDElcOkzJ3Orz+9FbPhxfPCLcD90NzZyuMI0SfgKujQ7OnzBPUY5BH0EO/39h3rCPYj8d/t/O75+gn5Efcf/xr9E/4eAQQI5wkFACAB/gD4BAYD8v7qAfEG+gYSBwYHBAkBCwoHEggDCvgJ7QsFDfESCRL4CAMKCwwNC/0P8gz1DgQPBBLyDQwOBBSAgICAgICAgICAgICAgICAgI" +
        "CAgICAwpLAosmazK5Cuxax4MXywS+//dDa2cjkCNEo4Szpzu3n9AT2GeUS9RHw9vge7Qj4JfPd7/zv+fwK+xL4IAEb/hQAIAQFC+ULBgIiA/4C9wYHBfEA6QPwCPoIEwoGCgQMAQ4KChMLAw34DOwOBRDxFAoV9wsDDQwPDg79EvIP9REEEQQV8hANEQQXgICAgICAgICAgICAgICAgICAgICAgL+PvaDHl8qsRboXr97E8sAxvv3Q2drF5AjRKuIv68zu5vYF+BrmE/cS8vb5H+4I+if13PD88fn+C/0T+iIDHQAVAiIGBQ3kDgYEIwX+BfcJBwjw" +
        "A+gG7wv6CxQNBgwEDwERCg0UDgMP9w7rEQYT8BgKGPcOAxANEg8R/RXyEvQUBRQFGPETDhQEGoCAgICAgICAgICAgICAgICAgICAgIC8jLqexJTIq0m5GK7dxPG/M7780dfaw+UI0izjMezK8OX3Bfkb5xT5E/T2+yHwCPwo9try/PL4AAsAE/wjBR4CFgUjCQUQ4xAGByUI/gj3CwcK8AXnCO8O+Q4UDwcPBBEBFAsPFREEEvcR6RQGFu8bCxv3EQMTDRUQFP0Y8RXzFwUXBRzwFg4XBR2AgICAgICAgICAgICAgICAgICAgICAuYm3nMKSxapMuR" +
        "mt3MTwvzW9/NHW28DnCdIu5DPuyPLj+QX7HekU+xT29f0i8gj+KvnZ9Pz0+AIMAhT/JQggBRcHJQwGE+ETBwkmC/4L9w4HDe8I5gvuEfkRFRIHEgQVARcLExYUBBX3FegXBhnvHgse9hQDFw4YERf9G/EZ8xoFGwUf8BoPGwUhgICAgICAgICAgICAgICAgICAgICAgLeHtJvAj8OpT7gbrNrE7784vfzS1Ny+6AnTMOU278X04vsF/h7qFf0V+PUAI/QIACz71/b89/cFDQUVASYLIQcYCiYPBhbgFgcMKA7+DvYRCBDvC+UO7hT5FBYWBxUFGAEa" +
        "CxYXFwQY9hjnGgYd7iIMIvYXAxoOHBIb/R/wHPIeBR4GI+8dDx4FJYCAgICAgICAgICAgICAgICAgICAgIC0hbCZvY3BqFO4HKvZxe6+Or380tLeu+kJ1DLnOPHD9uH+BgAf7Bb/Ffr0AiX2CQMu/tX5/Pn3CA4IFQQoDiIKGQ0oEgcZ3xoIDykR/hH2FQgT7g7kEu0Y+BcXGQcZBRsBHgwZGBsEHPYc5h4HIe0mDCb2GwMeDx8TH/0j8CDxIgUiBifvIRAiBSmAgICAgICAgICAgICAgICAgICAgICAsYOtmLuMvqhWuB2r2MXuvzy9+9TR37nrCt" +
        "U06Tr0wfjfAAYDIO4WAhb99AUm+QkFMADU+/z89goOCxYHKREkDRoQKRYHHd4dCBMrFP4V9hgIF+4S4xXtHPgbGB0IHAUfACIMHRkfBR/2IOUiByXtKg0q9R8DIhAjEyL9Ju8k8SYFJgYr7iUQJwYtgICAgICAgICAgICAgICAgICAgICAgK6Bqpe4irynWbgeqtbG7b8+vvvVz+G27QrWNus99r/73gMGBSLxFwQX//QIJ/wJCDED0v78/vYODw4XCioUJRAbEysaByHcIQgWLBj+GfYcCBvtFeIZ7CD4HhghCCAFIwAmDSEaIwUj9STkJgcp7C4N" +
        "LvUjAyYQJxQn/SvvKfAqBSoGL+0pESsGMYCAgICAgICAgICAgICAgICAgICAgICsgKeWtoi6p1y4H6rVx+y/QL/71s7jtO8K2DjtP/m9/t0GBwgj8xgHGALzCyn+CQszBtEB/AH1ERASFw4sGCYTHRYsHQgl2yUJGi4c/h31IAke7RnhHesk9yIZJQgkBScAKg0lGycFJ/Uo4yoILewyDjL1JwMrESwVK/0v7i3vLwUuBzTtLhIwBjaAgICAgICAgICAgICAgICAgICAgICAgICklrOHt6dguCGq1MjrwEK/+9jM5bHyCto670H7uwHbCQcMJPYYCh" +
        "kF8w4qAgkPNQrPBPwF9RQQFhgRLRsoFx4aLiIIKdopCR4vIP4h9SQJI+wd4CHrKPcnGikJKAUrAC4NKRwsBSz1LOIuCDLrNw839CwDLxEwFi/8NO4y7zQFMwc57DISNAY7gICAgICAgICAgICAgICAgICAgICAgICAoZaxhrWoY7kiqtLK6sFEwPray+eu9AvcPPJE/7gE2gwHDyX5GQ4aCfISLAUJEjcNzQf7CPQYERoYFS8fKRsfHjAmCS3YLQkiMST+JfUoCSfsId8l6i32KxsuCS0FMAAzDi4dMAYw9DHgMwg36jwPPPQwAzQSNRc0/DjuNu44" +
        "BjcHPes3EzkHQICAgICAgICAgICAgICAgICAgICAgICAgJ6VroWzqGa6I6vRy+rCRsL63MnqrPcL3j71RgK2B9kQBxMm/BoRGwzyFS0ICRY5EcwL+wz0HBIeGRkwIyofICIxKgky1zIKJjIo/ir1LAor6ybeKeox9jAcMgkxBjQAOA4yHjUGNfQ23zgJPOpBEEH0NQM5EzoYOfw97TvtPgY8CEPrPBM/B0WAgICAgICAgICAgICAgICAgICAgICAgICblqyFsKlquySs0M3pw0jD+t7I7Kn6C+BA+EgFtAvXEwgXKP8aFRwQ8hkuDAoaOxXKD/sP8y" +
        "ASIhodMSgsIyEmMy8KNtY3Cio0Lf4u9DEKMOsq3S7pNvY0HTcKNgY5AD0ONx86Bjn0O949CUHpRhBG8zoDPhM/GT78Qu1B7UMGQQhI6kEURAdKgICAgICAgICAgICAgICAgICAgICAgICAl5aphK6qbbwlrM/P6MVLxfrhxu+n/QzjQvtKCbIP1hcIGykDGxkdFPEdMBAKHjwZyRP7FPMkEycaIjMsLSciKzQ0CjvVPAsvNTL+M/Q2CjXqL9wz6Tz1OR08CjsGPgBCDzwgPwc/80DdQglG6EwRS/M/A0QURBpE/EjsRuxIBkcITepHFUoHUICAgICA" +
        "gICAgICAgICAgICAgICAgICAgJSWp4Ssq3C+J67N0efGTcf548XypAAM5kT+TQ2wE9UbCB8qBxwdHhjxIjEUCiI+HscX+xjyKRQrGyY0MS8sIy82OQpA00ELNDc3/jn0Owo66TTcOOhB9T8eQQpABkQARw9CIUUHRPNG3EgKTOhREVHzRQNJFEoaSfxN7EzrTgZMCFPpTBVPCFaAgICAgICAgICAgICAgICAgICAgICAgICRl6WEqaxzvyivzNTmyE/J+ebD9qIEDOlGAk8RrhfTHwgjKwsdIh8c8SYyGQonQCLGG/sc8i4VMBwrNjYwMCQ0Nz4LRt" +
        "JGCzk4PP4+9EALP+k52z3oRvVEH0cLRgZJAE0PRyJKB0nzS9tNClLnVxJX8koDTxVQG0/8U+tR61QGUglZ6FIWVQhcgICAgICAgICAgICAgICAgICAgICAgICAjpiihKeud8EpsMvW5spRy/npwfmfCA3sSAZRFasb0iQJKC0PHSYgIfArNB0KLEInxCD7IfEzFTUcMDc7MTUlOTlEC0vRTAw+OkH+RPNGC0XoP9pD50z0SiBMC0sGTwBTEE0jUAdP8lHaUwpY510SXfJQA1UWVhxV/FnrV+paBlgJX+hYFlwIYoCAgICAgICAgICAgICAgICAgICA" +
        "gICAgIuZoISlsHrDKrLJ2eXMU8357MD9nQsN70oKVBmpINEpCS0uEx4rISXwMDUiCjFELMIk+ybxOBY7HTU5QDM6Jj46SgxRz1EMRDtH/knzTAtK6ETZSOZS9E8hUgtRB1X/WRBTJFYIVfJX2FkKXuZjE2PyVgNbFlwdW/xf617pYAZeCWXnXhdiCGiAgICAgICAgICAgICAgICAgICAgICAgICImp2ForF9xiy0yNzkz1XQ+PC+AZoQDfNMDlYepyXPLQkyLxgfMCIq7zU2Jws2RjHBKfsr8D0XQB46OkY0QChEPFAMV85XDUk9Tf5P81IMUOdK2E" +
        "7mWPRVIVgMVwdb/18RWSVcCFvyXddfC2TlahNp8VwDYhdiHmH8Zepk6WcGZAps5mQYaQlvgICAgICAgICAgICAgICAgICAgICAgICAhZybhqC0gIAttsff49JX0/jzvQWYFA32ThJYI6UqzjIJNzAcHzUjL+86OCwLO0c2vy/7MPBCF0YeQDtMNUUpSj5WDF3NXQ1PPlP+VfNYDFbnUNdU5V/zWyJfDF0HYf9lEV8mYwhh8WTWZgtr5XEUcPFjA2gXaR9o/Gzqa+htB2sKc+ZrGG8JdoCAgICAgICAgICAgICAgICAgICAgICAgIGdmIeetoCALrjF" +
        "4+LUWdb497sJlRkO+k8XWyijL804CjwyISA6JDXvQDkxC0FJPL40+zXvSBhMH0Y9UjdLKk8/XA1jy2QNVUBZ/1zyXgxc5lbWW+Vl82IjZQxkB2j/bBFmJ2kIZ/Fq1WwLcuR3FHfxagNvGG8gb/xz6XLndAdyCnrlchl2CX2AgICAgICAgICAgICAgICAgICAgICAgICAgJaIm7iAgC+7xOfi2FvZ+Pu6DpMdDv9RHF0toTTLPQpCMyYhQCU67kU6NwtGS0K8Ovs7704ZUiBMPlg4UStVQWMNaspqDltBX/9i8mQMY+Zd1WHkbPNoJGwMagdu/3MSbC" +
        "hwCW7xcdRzDHnjfhV+8HADdhl2IXb7eul553sHeICA5XkZfoCAgICAgICAgICAgICAgICAgICAgICAgICAgICTiZm7gIAwvcPq4dtd3fcAuBKQIg4DUyFfMp46ykMKSDQsIUYmQO5LPDwLTE1Iuj/7Qe5UGVggUkBeOlcsXEJpDnHJcQ5iQ2b/afJrDWrlY9Ro5HPybyVzDXEHdf96EnMpdwl18HjTeoCAgICAgPB3A34ZfSF9gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkYuXvoCAMsDB7uDeYOD3BLcXjScPB1Um" +
        "YjicQMlJC041MSJMJ0btUT1CC1JPTrlF+0fuWhpfIVhBZTteLWJEcA54yHgOaURt/3Dycg1w5WrTb+N68nYleg14CHyAgBJ6Kn4JfICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI6NlcGAgDPDwPPf4mLk9wm1HIstDwxXK2Q+mkbHTwtUNzcjUihM7Vg+SAxZUVS3S/tN7mEbZiJfQms8ZC5pRXeAgICAD29GdP938XkNeORx0naAgPF9gICAgICAgICAgICAgICAgICAgICAgICAgI" +
        "CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICMjpLEgIA0xr/33uZk6PcOtCGIMg8RWTFmRJhMxlULWjg9JFgpUu1eQE8MX1JbtlL7U+1oHG0iZkRyPmsvcICAgICAgA93R3uAgICAgIDkeNF9gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAipGQyICANcq+/N7qZuz2E7InhjgPFls3aEqWU8VcC2E5QyRfKlns" +
        "ZUFVDGZUYbRY+1rtbxx0I21FeT9yMHeAgICAgIAQfoCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIeTjsyAgDbNvADd7mjx9hixLYM+EBxdPWtQk1nDYgxoOkklZStf7GxCXAxtVmizX/th7HYdeyN0gIBAeTJ+gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
        "CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICFlovQgIA40bsF3PNq9fYdrzOBRBAhX0NtV5FgwmkMbztQJmwrZutzRGMMdFhwsWb7aOx9gIAke4CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgpiJ1ICAOdW6C9v3bPr2I605gIAQJ2FJb16PZ8FwDHY9VyZzLG3rekVqDHtad69t+2+AgICA" +
        "gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAh9iAgDrauBDa/G7/9SmsP4CAES1jUHJljW6/dwx9Pl0ney11gIBGcYCAXH6udft2gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";
    Lemmings.ParticleTable = ParticleTable;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** manage the sprites need for the game skill panel */
    class SkillPanelSprites {
        constructor(fr2, fr6, colorPalette) {
            this.letterSprite = {};
            this.numberSpriteLeft = [];
            this.numberSpriteRight = [];
            /// read skill panel
            let paletteImg = new Lemmings.PaletteImage(320, 40);
            paletteImg.processImage(fr6, 4);
            this.panelSprite = paletteImg.createFrame(colorPalette);
            /// read green panel letters
            let letters = ["%", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
            for (let l = 0; l < letters.length; l++) {
                let paletteImg = new Lemmings.PaletteImage(8, 16);
                paletteImg.processImage(fr6, 3);
                this.letterSprite[letters[l]] = paletteImg.createFrame(colorPalette);
            }
            /// add space
            let emptyFrame = new Lemmings.Frame(8, 16);
            emptyFrame.fill(0, 0, 0);
            this.letterSprite[" "] = emptyFrame;
            let blackAndWithPalette = new Lemmings.ColorPalette();
            blackAndWithPalette.setColorRGB(1, 255, 255, 255);
            /// read panel skill-count number letters
            fr2.setOffset(0x1900);
            for (let i = 0; i < 10; i++) {
                let paletteImgRight = new Lemmings.PaletteImage(8, 8);
                paletteImgRight.processImage(fr2, 1);
                paletteImgRight.processTransparentByColorIndex(0);
                this.numberSpriteRight.push(paletteImgRight.createFrame(blackAndWithPalette));
                let paletteImgLeft = new Lemmings.PaletteImage(8, 8);
                paletteImgLeft.processImage(fr2, 1);
                paletteImgLeft.processTransparentByColorIndex(0);
                this.numberSpriteLeft.push(paletteImgLeft.createFrame(blackAndWithPalette));
            }
            /// add space
            this.emptyNumberSprite = new Lemmings.Frame(9, 8);
            this.emptyNumberSprite.fill(255, 255, 255);
        }
        /** return the sprite for the skill panel */
        getPanelSprite() {
            return this.panelSprite;
        }
        /** return a green letter */
        getLetterSprite(letter) {
            return this.letterSprite[letter.toUpperCase()];
        }
        /** return a number letter */
        getNumberSpriteLeft(number) {
            return this.numberSpriteLeft[number];
        }
        /** return a number letter */
        getNumberSpriteRight(number) {
            return this.numberSpriteRight[number];
        }
        getNumberSpriteEmpty() {
            return this.emptyNumberSprite;
        }
    }
    Lemmings.SkillPanelSprites = SkillPanelSprites;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** Handels a mask of points for the level background
     *   that defines the solid points of the level */
    class SolidLayer {
        constructor(width, height, mask = null) {
            this.width = 0;
            this.height = 0;
            this.width = width;
            this.height = height;
            if (mask != null) {
                this.groundMask = mask;
            }
        }
        /** check if a point is solid */
        hasGroundAt(x, y) {
            if ((x < 0) || (x >= this.width))
                return false;
            if ((y < 0) || (y >= this.height))
                return false;
            return (this.groundMask[x + y * this.width] != 0);
        }
        /** clear a point  */
        clearGroundAt(x, y) {
            let index = x + y * this.width;
            this.groundMask[index] = 0;
        }
        /** clear a point  */
        setGroundAt(x, y) {
            let index = x + y * this.width;
            this.groundMask[index] = 1;
        }
    }
    Lemmings.SolidLayer = SolidLayer;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    var SpriteTypes;
    (function (SpriteTypes) {
        SpriteTypes[SpriteTypes["WALKING"] = 0] = "WALKING";
        SpriteTypes[SpriteTypes["EXPLODING"] = 1] = "EXPLODING";
        SpriteTypes[SpriteTypes["JUMPING"] = 2] = "JUMPING";
        SpriteTypes[SpriteTypes["DIGGING"] = 3] = "DIGGING";
        SpriteTypes[SpriteTypes["CLIMBING"] = 4] = "CLIMBING";
        SpriteTypes[SpriteTypes["POSTCLIMBING"] = 5] = "POSTCLIMBING";
        SpriteTypes[SpriteTypes["BUILDING"] = 6] = "BUILDING";
        SpriteTypes[SpriteTypes["BLOCKING"] = 7] = "BLOCKING";
        SpriteTypes[SpriteTypes["BASHING"] = 8] = "BASHING";
        SpriteTypes[SpriteTypes["FALLING"] = 9] = "FALLING";
        SpriteTypes[SpriteTypes["UMBRELLA"] = 10] = "UMBRELLA";
        SpriteTypes[SpriteTypes["SPLATTING"] = 11] = "SPLATTING";
        SpriteTypes[SpriteTypes["MINEING"] = 12] = "MINEING";
        SpriteTypes[SpriteTypes["DROWNING"] = 13] = "DROWNING";
        SpriteTypes[SpriteTypes["EXITING"] = 14] = "EXITING";
        SpriteTypes[SpriteTypes["FRYING"] = 15] = "FRYING";
        SpriteTypes[SpriteTypes["OHNO"] = 16] = "OHNO";
        SpriteTypes[SpriteTypes["LEMACTION_SHRUG"] = 17] = "LEMACTION_SHRUG";
        SpriteTypes[SpriteTypes["SHRUGGING"] = 18] = "SHRUGGING";
        SpriteTypes[SpriteTypes["OUT_OFF_LEVEL"] = 19] = "OUT_OFF_LEVEL";
    })(SpriteTypes = Lemmings.SpriteTypes || (Lemmings.SpriteTypes = {}));
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** Class to provide a read pointer and readfunctions to a binary Buffer */
    class BinaryReader {
        constructor(dataArray, offset = 0, length, filename = "[unknown]") {
            this.log = new Lemmings.LogHandler("BinaryReader");
            this.filename = filename;
            if (offset == null)
                offset = 0;
            let dataLenght = 0;
            if (dataArray == null) {
                this.data = new Uint8Array(0);
                dataLenght = 0;
                this.log.log("BinaryReader from NULL; size:" + 0);
            }
            else if (dataArray instanceof BinaryReader) {
                //- if dataArray is BinaryReader use there data
                this.data = dataArray.data;
                dataLenght = dataArray.length;
                this.log.log("BinaryReader from BinaryReader; size:" + dataLenght);
            }
            else if (dataArray instanceof Uint8Array) {
                this.data = dataArray;
                dataLenght = dataArray.byteLength;
                this.log.log("BinaryReader from Uint8Array; size:" + dataLenght);
            }
            else if (dataArray instanceof ArrayBuffer) {
                this.data = new Uint8Array(dataArray);
                dataLenght = dataArray.byteLength;
                this.log.log("BinaryReader from ArrayBuffer; size:" + dataLenght);
            }
            else if (dataArray instanceof Blob) {
                this.data = new Uint8Array(dataArray);
                dataLenght = this.data.byteLength;
                this.log.log("BinaryReader from Blob; size:" + dataLenght);
            }
            else {
                this.data = dataArray;
                dataLenght = this.data.length;
                this.log.log("BinaryReader from unknown: " + dataArray + "; size:" + dataLenght);
            }
            if (length == null)
                length = dataLenght - offset;
            this.hiddenOffset = offset;
            this.length = length;
            this.pos = this.hiddenOffset;
        }
        /** Read one Byte from stream */
        readByte(offset) {
            if (offset != null)
                this.pos = (offset + this.hiddenOffset);
            if ((this.pos < 0) || (this.pos > this.data.length)) {
                this.log.log("read out of data: " + this.filename + " - size: " + this.data.length + " @ " + this.pos);
                return 0;
            }
            let v = this.data[this.pos];
            this.pos++;
            return v;
        }
        /** Read one DWord (4 Byte) from stream (little ending) */
        readInt(length = 4, offset) {
            if (offset == null)
                offset = this.pos;
            if (length == 4) {
                let v = (this.data[offset] << 24) | (this.data[offset + 1] << 16) | (this.data[offset + 2] << 8) | (this.data[offset + 3]);
                this.pos = offset + 4;
                return v;
            }
            let v = 0;
            for (let i = length; i > 0; i--) {
                v = (v << 8) | this.data[offset];
                offset++;
            }
            this.pos = offset;
            return v;
        }
        /** Read one DWord (4 Byte) from stream (big ending) */
        readIntBE(offset) {
            if (offset == null)
                offset = this.pos;
            let v = (this.data[offset]) | (this.data[offset + 1] << 8) | (this.data[offset + 2] << 16) | (this.data[offset + 3] << 24);
            this.pos = offset + 4;
            return v;
        }
        /** Read one Word (2 Byte) from stream (big ending) */
        readWord(offset) {
            if (offset == null)
                offset = this.pos;
            let v = (this.data[offset] << 8) | (this.data[offset + 1]);
            this.pos = offset + 2;
            return v;
        }
        /** Read one Word (2 Byte) from stream (big ending) */
        readWordBE(offset) {
            if (offset == null)
                offset = this.pos;
            let v = (this.data[offset]) | (this.data[offset + 1] << 8);
            this.pos = offset + 2;
            return v;
        }
        /** Read a String */
        readString(length, offset) {
            if (offset === null)
                this.pos = offset + this.hiddenOffset;
            let result = "";
            for (let i = 0; i < length; i++) {
                let v = this.data[this.pos];
                this.pos++;
                result += String.fromCharCode(v);
            }
            return result;
        }
        /** return the current curser position */
        getOffset() {
            return this.pos - this.hiddenOffset;
        }
        /** set the current curser position */
        setOffset(newPos) {
            this.pos = newPos + this.hiddenOffset;
        }
        /** return true if the curserposition is out of data */
        eof() {
            let pos = this.pos - this.hiddenOffset;
            return ((pos >= this.length) || (pos < 0));
        }
        /** return a String of the data */
        readAll() {
            return this.readString(this.length, 0);
        }
    }
    Lemmings.BinaryReader = BinaryReader;
})(Lemmings || (Lemmings = {}));
/// <reference path="binary-reader.ts"/>
var Lemmings;
(function (Lemmings) {
    //------------------------
    // reads the bits on a BinaryReader
    class BitReader {
        constructor(fileReader, offset, length, initBufferLength) {
            this.pos = 0;
            //- create a copy of the reader
            this.binReader = new Lemmings.BinaryReader(fileReader, offset, length, fileReader.filename);
            this.pos = length;
            this.pos--;
            this.buffer = this.binReader.readByte(this.pos);
            this.bufferLen = initBufferLength;
            this.checksum = this.buffer;
        }
        getCurrentChecksum() {
            return this.checksum;
        }
        /** read and return [bitCount] bits from the stream */
        read(bitCount) {
            let result = 0;
            for (var i = bitCount; i > 0; i--) {
                if (this.bufferLen <= 0) {
                    this.pos--;
                    var b = this.binReader.readByte(this.pos);
                    this.buffer = b;
                    this.checksum ^= b;
                    this.bufferLen = 8;
                }
                this.bufferLen--;
                result = (result << 1) | (this.buffer & 1);
                this.buffer >>= 1;
            }
            return result;
        }
        eof() {
            return ((this.bufferLen <= 0) && (this.pos < 0));
        }
    }
    Lemmings.BitReader = BitReader;
})(Lemmings || (Lemmings = {}));
/// <reference path="bit-reader.ts"/>
/// <reference path="binary-reader.ts"/>
var Lemmings;
(function (Lemmings) {
    /** Bit Stream Writer class */
    class BitWriter {
        constructor(bitReader, outLength) {
            this.log = new Lemmings.LogHandler("BitWriter");
            this.outData = new Uint8Array(outLength);
            this.outPos = outLength;
            this.bitReader = bitReader;
        }
        /** copy lenght bytes from the reader */
        copyRawData(length) {
            if (this.outPos - length < 0) {
                this.log.log("copyRawData: out of out buffer");
                length = this.outPos;
                return;
            }
            for (; length > 0; length--) {
                this.outPos--;
                this.outData[this.outPos] = this.bitReader.read(8);
            }
        }
        /** Copy length bits from the write cache */
        copyReferencedData(length, offsetBitCount) {
            /// read offset to current write pointer to read from
            var offset = this.bitReader.read(offsetBitCount) + 1;
            /// is offset in range?
            if (this.outPos + offset > this.outData.length) {
                this.log.log("copyReferencedData: offset out of range");
                offset = 0;
                return;
            }
            /// is lenght in range
            if (this.outPos - length < 0) {
                this.log.log("copyReferencedData: out of out buffer");
                length = this.outPos;
                return;
            }
            for (; length > 0; length--) {
                this.outPos--;
                this.outData[this.outPos] = this.outData[this.outPos + offset];
            }
        }
        /** return a  BinaryReader with the data written to this BitWriter class */
        getFileReader(filename) {
            return new Lemmings.BinaryReader(this.outData, null, null, filename);
        }
        eof() {
            return this.outPos <= 0;
        }
    }
    Lemmings.BitWriter = BitWriter;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** Read the container file and return the unpacked parts of it  */
    class FileContainer {
        /** read the content of the container  */
        constructor(content) {
            this.log = new Lemmings.LogHandler("FileContainer");
            this.read(content);
        }
        /** Unpack a part (chunks / segments) of the file and return it */
        getPart(index) {
            if ((index < 0) || (index >= this.parts.length)) {
                this.log.log("getPart(" + index + ") Out of index!");
                return new Lemmings.BinaryReader();
            }
            return this.parts[index].unpack();
        }
        /** return the number of parts in this file */
        count() {
            return this.parts.length;
        }
        /** do the read job and find all parts in this container */
        read(fileReader) {
            /// reset parts
            this.parts = new Array();
            /// we start at the end of the file
            var pos = 0;
            /// the size of the header
            const HEADER_SIZE = 10;
            while (pos + HEADER_SIZE < fileReader.length) {
                fileReader.setOffset(pos);
                let part = new Lemmings.UnpackFilePart(fileReader);
                /// start of the chunk
                part.offset = pos + HEADER_SIZE;
                /// Read Header of each Part
                part.initialBufferLen = fileReader.readByte();
                part.checksum = fileReader.readByte();
                part.unknown1 = fileReader.readWord();
                part.decompressedSize = fileReader.readWord();
                part.unknown0 = fileReader.readWord();
                var size = fileReader.readWord();
                part.compressedSize = size - HEADER_SIZE;
                /// position of this part in the container
                part.index = this.parts.length;
                /// check if the data are valid
                if ((part.offset < 0) || (size > 0xFFFFFF) || (size < 10)) {
                    this.log.log("out of sync " + fileReader.filename);
                    break;
                }
                //- add part
                this.parts.push(part);
                //this.error.debug(part);
                /// jump to next part
                pos += size;
            }
            this.log.debug(fileReader.filename + " has " + this.parts.length + " file-parts.");
        }
    }
    Lemmings.FileContainer = FileContainer;
})(Lemmings || (Lemmings = {}));
/// <reference path="binary-reader.ts"/>
var Lemmings;
(function (Lemmings) {
    /**
    * Handle Files loading from remote/web
    */
    class FileProvider {
        constructor(rootPath) {
            this.rootPath = rootPath;
            this.log = new Lemmings.LogHandler("FileProvider");
        }
        /** load binary data from URL: rootPath + [path] + filename */
        loadBinary(path, filename = null) {
            let url = this.rootPath + path + ((filename == null) ? "" : "/" + filename);
            this.log.debug("loading:" + url);
            return new Promise((resolve, reject) => {
                var xhr = new XMLHttpRequest();
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        let reader = new Lemmings.BinaryReader(xhr.response, 0, null, this.filenameFormUrl(url));
                        resolve(reader);
                    }
                    else {
                        this.log.log("error load file:" + url);
                        reject({ status: xhr.status, statusText: xhr.statusText });
                    }
                };
                xhr.onerror = () => {
                    this.log.log("error load file:" + url);
                    reject({ status: xhr.status, statusText: xhr.statusText });
                };
                xhr.open("GET", url);
                xhr.responseType = "arraybuffer";
                xhr.send();
            });
        }
        /** load string data from URL */
        loadString(url) {
            this.log.log("Load file as string: " + url);
            return new Promise((resolve, reject) => {
                let xhr = new XMLHttpRequest();
                xhr.onload = (oEvent) => {
                    resolve(xhr.response);
                };
                xhr.onerror = () => {
                    this.log.log("error load file:" + url);
                    reject({ status: xhr.status, statusText: xhr.statusText });
                };
                /// setup query
                xhr.open('GET', url, true);
                xhr.responseType = "text";
                /// call url
                xhr.send(null);
            });
        }
        // Extract filename form URL
        filenameFormUrl(url) {
            if (url == "")
                return "";
            url = url.substring(0, (url.indexOf("#") == -1) ? url.length : url.indexOf("#"));
            url = url.substring(0, (url.indexOf("?") == -1) ? url.length : url.indexOf("?"));
            url = url.substring(url.lastIndexOf("/") + 1, url.length);
            return url;
        }
    }
    Lemmings.FileProvider = FileProvider;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** represents a part/chunk of a file and is  */
    class UnpackFilePart {
        constructor(fileReader) {
            /** file offset in the container */
            this.offset = 0;
            /** flag for uncompressing */
            this.initialBufferLen = 0;
            /** checksum this file need to have */
            this.checksum = 0;
            /** size the uncompressed chunk should have */
            this.decompressedSize = 0;
            /** the size the compressed chunk had */
            this.compressedSize = 0;
            this.unknown0 = 0;
            this.unknown1 = 0;
            /** position of this part/chunk in the container */
            this.index = 0;
            this.log = new Lemmings.LogHandler("UnpackFilePart");
            this.fileReader = fileReader;
            this.unpackingDone = false;
        }
        /** unpack this content and return a BinaryReader */
        unpack() {
            /// if the unpacking is not yet done, do it...
            if (!this.unpackingDone) {
                this.fileReader = this.doUnpacking(this.fileReader);
                this.unpackingDone = true;
                return this.fileReader;
            }
            /// use the cached file buffer but with a new file pointer
            return new Lemmings.BinaryReader(this.fileReader);
        }
        /// unpack the fileReader
        doUnpacking(fileReader) {
            var bitReader = new Lemmings.BitReader(fileReader, this.offset, this.compressedSize, this.initialBufferLen);
            var outBuffer = new Lemmings.BitWriter(bitReader, this.decompressedSize);
            while ((!outBuffer.eof()) && (!bitReader.eof())) {
                if (bitReader.read(1) == 0) {
                    switch (bitReader.read(1)) {
                        case 0:
                            outBuffer.copyRawData(bitReader.read(3) + 1);
                            break;
                        case 1:
                            outBuffer.copyReferencedData(2, 8);
                            break;
                    }
                }
                else {
                    switch (bitReader.read(2)) {
                        case 0:
                            outBuffer.copyReferencedData(3, 9);
                            break;
                        case 1:
                            outBuffer.copyReferencedData(4, 10);
                            break;
                        case 2:
                            outBuffer.copyReferencedData(bitReader.read(8) + 1, 12);
                            break;
                        case 3:
                            outBuffer.copyRawData(bitReader.read(8) + 9);
                            break;
                    }
                }
            }
            if (this.checksum == bitReader.getCurrentChecksum()) {
                this.log.debug("doUnpacking(" + fileReader.filename + ") done! ");
            }
            else {
                this.log.log("doUnpacking(" + fileReader.filename + ") : Checksum mismatch! ");
            }
            /// create FileReader from buffer
            var outReader = outBuffer.getFileReader(fileReader.filename + "[" + this.index + "]");
            return outReader;
        }
    }
    Lemmings.UnpackFilePart = UnpackFilePart;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** The ColorPalette Class provides a Collor Palette of the game.
     *  use:
     *                           INDEX    RGBA
     * read:  ColorPalette.data[0 ... 16].color;
     * write: ColorPalette.setColor(INT index, INT r, INT g, INT b, BOOL locked)
     */
    class ColorPalette {
        constructor() {
            this.data = new Uint32Array(16); //- 16 colors
            this.data.fill(0);
        }
        /** set color from Int-Value e.g. 0xFF00FF00 */
        setColorInt(index, colorValue) {
            this.data[index] = colorValue;
        }
        /** return a int-color value e.g. 0xFF00FF00 */
        getColor(index) {
            return this.data[index];
        }
        getR(index) {
            return this.data[index] & 0xFF;
        }
        getG(index) {
            return (this.data[index] >> 8) & 0xFF;
        }
        getB(index) {
            return (this.data[index] >> 16) & 0xFF;
        }
        /** set color from R,G,B */
        setColorRGB(index, r, g, b) {
            this.setColorInt(index, ColorPalette.colorFromRGB(r, g, b));
        }
        static colorFromRGB(r, g, b) {
            return 0xFF << 24 | b << 16 | g << 8 | r << 0;
        }
        static get black() {
            return 0xFF000000;
        }
        static get debugColor() {
            return 0xFFFF00FF;
        }
    }
    Lemmings.ColorPalette = ColorPalette;
})(Lemmings || (Lemmings = {}));
/// <reference path="../file/binary-reader.ts"/>
/// <reference path="./color-palette.ts"/>
var Lemmings;
(function (Lemmings) {
    /** base image information of objects */
    class BaseImageInfo {
        constructor() {
            this.width = 0;
            this.height = 0;
            /// normale case
            ///           +------------+
            /// imageLoc: |            | 1st Bits
            ///           |            | 2th Bits
            /// vgaLoc:   |            | 3th Bits
            /// maskLoc:  |            | 4th Bits
            ///           +------------+
            /** position of the image in the file */
            this.imageLoc = 0;
            /** position of the (alpha) mask in the file */
            this.maskLoc = 0;
            /** position of the vga bits in the file */
            this.vgaLoc = 0;
            /** size of one frame in the file */
            this.frameDataSize = 0;
            /** number of frames used by this image */
            this.frameCount = 0;
            /** the color palette to be used for this image */
            this.palette = null;
        }
    }
    Lemmings.BaseImageInfo = BaseImageInfo;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** Define Types a triggers */
    var TriggerTypes;
    (function (TriggerTypes) {
        TriggerTypes[TriggerTypes["NO_TRIGGER"] = 0] = "NO_TRIGGER";
        TriggerTypes[TriggerTypes["EXIT_LEVEL"] = 1] = "EXIT_LEVEL";
        TriggerTypes[TriggerTypes["UNKNOWN_2"] = 2] = "UNKNOWN_2";
        TriggerTypes[TriggerTypes["UNKNOWN_3"] = 3] = "UNKNOWN_3";
        TriggerTypes[TriggerTypes["TRAP"] = 4] = "TRAP";
        TriggerTypes[TriggerTypes["DROWN"] = 5] = "DROWN";
        TriggerTypes[TriggerTypes["KILL"] = 6] = "KILL";
        TriggerTypes[TriggerTypes["ONWAY_LEFT"] = 7] = "ONWAY_LEFT";
        TriggerTypes[TriggerTypes["ONWAY_RIGHT"] = 8] = "ONWAY_RIGHT";
        TriggerTypes[TriggerTypes["STEEL"] = 9] = "STEEL";
        TriggerTypes[TriggerTypes["BLOCKER_LEFT"] = 10] = "BLOCKER_LEFT";
        TriggerTypes[TriggerTypes["BLOCKER_RIGHT"] = 11] = "BLOCKER_RIGHT";
    })(TriggerTypes = Lemmings.TriggerTypes || (Lemmings.TriggerTypes = {}));
})(Lemmings || (Lemmings = {}));
/// <reference path="./base-image-info.ts"/>
/// <reference path="./trigger-types.ts"/>
var Lemmings;
(function (Lemmings) {
    /** stores sprite image properties of objects */
    class ObjectImageInfo extends Lemmings.BaseImageInfo {
        constructor() {
            super(...arguments);
            this.animationLoop = false;
            this.firstFrameIndex = 0;
            this.unknown1 = 0;
            this.unknown2 = 0;
            this.trigger_left = 0;
            this.trigger_top = 0;
            this.trigger_width = 0;
            this.trigger_height = 0;
            this.trigger_effect_id = 0;
            this.preview_image_index = 0;
            this.unknown = 0;
            this.trap_sound_effect_id = 0;
        }
    }
    Lemmings.ObjectImageInfo = ObjectImageInfo;
})(Lemmings || (Lemmings = {}));
/// <reference path="./base-image-info.ts"/>
var Lemmings;
(function (Lemmings) {
    /** stores terrain/background image properties */
    class TerrainImageInfo extends Lemmings.BaseImageInfo {
    }
    Lemmings.TerrainImageInfo = TerrainImageInfo;
})(Lemmings || (Lemmings = {}));
/// <reference path="../file/binary-reader.ts"/>
/// <reference path="./color-palette.ts"/>
/// <reference path="./object-image-info.ts"/>
/// <reference path="./terrain-image-info.ts"/>
var Lemmings;
(function (Lemmings) {
    /** read all image meta information from ground file (GROUNDxO.DAT)
     *   and uses the VGAGx File to add the image-data to this images-list.
     * The ground file contains
     *  - the meta data for the level-background-images (e.g mud and grass)
     *  - the meta data for the level-object-images (e.g. Exists and Traps)
     *  - the color palettes to use
     * The VGAGx file contains
     *  - the image data (color-indexed) of the level-background-images
     *  - the image data (color-indexed) of the level-object-images (multi frame/animation)
    */
    class GroundReader {
        /** groundFile: GROUNDxO.DAT
         *  vgaTerrar: Part of VGAGx.DAT for the terrar-images
         *  vgaObject: Part of VGAGx.DAT with the object-images
         */
        constructor(groundFile, vgaTerrar, vgaObject) {
            this.imgObjects = new Array(16);
            this.imgTerrar = new Array(64);
            /** the color palette stored in this file */
            this.groundPalette = new Lemmings.ColorPalette();
            this.colorPalette = new Lemmings.ColorPalette();
            this.log = new Lemmings.LogHandler("GroundReader");
            if (groundFile.length != 1056) {
                this.log.log("groundFile " + groundFile.filename + " has wrong size: " + groundFile.length);
                return;
            }
            let BYTE_SIZE_OF_OBJECTS = 28 * 16;
            let BYTE_SIZE_OF_TERRAIN = 64 * 8;
            this.readPalettes(groundFile, BYTE_SIZE_OF_OBJECTS + BYTE_SIZE_OF_TERRAIN);
            this.readObjectImages(groundFile, 0, this.colorPalette);
            this.readTerrainImages(groundFile, BYTE_SIZE_OF_OBJECTS, this.groundPalette);
            this.readImages(this.imgObjects, vgaObject, 4);
            this.readImages(this.imgTerrar, vgaTerrar, 3);
        }
        /** return the images (meta + data) used for the Background */
        getTerraImages() {
            return this.imgTerrar;
        }
        /** return the images (meta + data) used for the map objects*/
        getObjectImages() {
            return this.imgObjects;
        }
        /** loads all images of imgList from the VGAGx file */
        readImages(imgList, vga, bitPerPixle) {
            imgList.map((img) => {
                img.frames = [];
                let filePos = img.imageLoc;
                for (let f = 0; f < img.frameCount; f++) {
                    var bitImage = new Lemmings.PaletteImage(img.width, img.height);
                    //// read image
                    bitImage.processImage(vga, bitPerPixle, filePos);
                    bitImage.processTransparentData(vga, filePos + img.maskLoc);
                    img.frames.push(bitImage.getImageBuffer());
                    /// move to the next frame data
                    filePos += img.frameDataSize;
                }
            });
        }
        /** loads the properties for object-images from the groundFile  */
        readObjectImages(frO, offset, colorPalett) {
            /// offset to the objects
            frO.setOffset(offset);
            for (let i = 0; i < 16; i++) {
                let img = new Lemmings.ObjectImageInfo();
                let flags = frO.readWordBE();
                img.animationLoop = ((flags & 1) == 0);
                img.firstFrameIndex = frO.readByte();
                img.frameCount = frO.readByte();
                img.width = frO.readByte();
                img.height = frO.readByte();
                img.frameDataSize = frO.readWordBE();
                img.maskLoc = frO.readWordBE();
                img.unknown1 = frO.readWordBE();
                img.unknown2 = frO.readWordBE();
                img.trigger_left = frO.readWordBE() * 4;
                img.trigger_top = frO.readWordBE() * 4 - 4;
                img.trigger_width = frO.readByte() * 4;
                img.trigger_height = frO.readByte() * 4;
                img.trigger_effect_id = frO.readByte();
                img.imageLoc = frO.readWordBE();
                img.preview_image_index = frO.readWordBE();
                img.unknown = frO.readWordBE();
                img.trap_sound_effect_id = frO.readByte();
                img.palette = colorPalett;
                if (frO.eof()) {
                    this.log.log("readObjectImages() : unexpected end of file: " + frO.filename);
                    return;
                }
                //- add Object
                this.imgObjects[i] = img;
            }
        }
        /** loads the properties for terrain-images  */
        readTerrainImages(frO, offset, colorPalette) {
            frO.setOffset(offset);
            for (let i = 0; i < 64; i++) {
                let img = new Lemmings.TerrainImageInfo();
                img.width = frO.readByte();
                img.height = frO.readByte();
                img.imageLoc = frO.readWordBE();
                /// use the delta offset to be compatible with the 'ObjectImageInfo.maskLoc'
                img.maskLoc = frO.readWordBE() - img.imageLoc;
                img.vgaLoc = frO.readWordBE();
                img.palette = colorPalette;
                img.frameCount = 1;
                if (frO.eof()) {
                    this.log.log("readTerrainImages() : unexpected end of file! " + frO.filename);
                    return;
                }
                //- add Object
                this.imgTerrar[i] = img;
            }
        }
        /** loads the palettes  */
        readPalettes(frO, offset) {
            /// jump over the EGA palettes
            frO.setOffset(offset + 3 * 8);
            /// read the VGA palette index 8..15
            for (let i = 0; i < 8; i++) {
                let r = frO.readByte() << 2;
                let g = frO.readByte() << 2;
                let b = frO.readByte() << 2;
                this.groundPalette.setColorRGB(i, r, g, b);
            }
            /// read the VGA palette index 0..7
            for (var i = 0; i < 8; i++) {
                let r = frO.readByte() << 2;
                let g = frO.readByte() << 2;
                let b = frO.readByte() << 2;
                this.colorPalette.setColorRGB(i, r, g, b);
            }
            /// read the VGA palette index 8..15 for preview
            for (let i = 8; i < 16; i++) {
                let r = frO.readByte() << 2;
                let g = frO.readByte() << 2;
                let b = frO.readByte() << 2;
                this.colorPalette.setColorRGB(i, r, g, b);
            }
        }
    }
    Lemmings.GroundReader = GroundReader;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** A LevelElement is a Object / Terrain Item used on a Level map */
    class LevelElement {
        constructor() {
            this.x = 0;
            this.y = 0;
            this.id = 0;
            this.frameIndex = 0;
        }
    }
    Lemmings.LevelElement = LevelElement;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class LevelProperties {
        constructor() {
            this.levelName = "";
            this.releaseRate = 0;
            this.releaseCount = 0;
            this.needCount = 0;
            this.timeLimit = 0;
            this.skills = new Array(Lemmings.SkillTypes.length());
        }
    }
    Lemmings.LevelProperties = LevelProperties;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** stores a rectangle range */
    class Range {
        constructor() {
            this.x = 0;
            this.y = 0;
            this.width = 0;
            this.height = 0;
        }
    }
    Lemmings.Range = Range;
})(Lemmings || (Lemmings = {}));
/// <reference path="../file/binary-reader.ts"/>
/// <reference path="./range.ts"/>
/// <reference path="./level-properties.ts"/>
var Lemmings;
(function (Lemmings) {
    /** read a level from LEVEL___.DAT file */
    class LevelReader {
        /// Load a Level
        constructor(fr) {
            this.levelWidth = 1600;
            this.levelHeight = 160;
            this.levelProperties = new Lemmings.LevelProperties();
            this.screenPositionX = 0;
            /** index of GROUNDxO.DAT file */
            this.graphicSet1 = 0;
            /** index of VGASPECx.DAT */
            this.graphicSet2 = 0;
            this.isSuperLemming = false;
            this.objects = [];
            this.terrains = [];
            this.steel = [];
            this.log = new Lemmings.LogHandler("LevelReader");
            this.readLevelInfo(fr);
            this.readLevelObjects(fr);
            this.readLevelTerrain(fr);
            this.readSteelArea(fr);
            this.readLevelName(fr);
            this.log.debug(this);
        }
        /** read general Level information */
        readLevelInfo(fr) {
            fr.setOffset(0);
            this.levelProperties.releaseRate = fr.readWord();
            this.levelProperties.releaseCount = fr.readWord();
            this.levelProperties.needCount = fr.readWord();
            this.levelProperties.timeLimit = fr.readWord();
            //- read amount of skills
            this.levelProperties.skills[Lemmings.SkillTypes.CLIMBER] = fr.readWord();
            this.levelProperties.skills[Lemmings.SkillTypes.FLOATER] = fr.readWord();
            this.levelProperties.skills[Lemmings.SkillTypes.BOMBER] = fr.readWord();
            this.levelProperties.skills[Lemmings.SkillTypes.BLOCKER] = fr.readWord();
            this.levelProperties.skills[Lemmings.SkillTypes.BUILDER] = fr.readWord();
            this.levelProperties.skills[Lemmings.SkillTypes.BASHER] = fr.readWord();
            this.levelProperties.skills[Lemmings.SkillTypes.MINER] = fr.readWord();
            this.levelProperties.skills[Lemmings.SkillTypes.DIGGER] = fr.readWord();
            this.screenPositionX = fr.readWord();
            this.graphicSet1 = fr.readWord();
            this.graphicSet2 = fr.readWord();
            this.isSuperLemming = (fr.readWord() != 0);
        }
        /** read the level objects */
        readLevelObjects(fr) {
            /// reset array
            this.objects = [];
            fr.setOffset(0x0020);
            for (var i = 0; i < 32; i++) {
                var newOb = new Lemmings.LevelElement();
                newOb.x = fr.readWord() - 16;
                newOb.y = fr.readWord();
                newOb.id = fr.readWord();
                var flags = fr.readWord();
                let isUpsideDown = ((flags & 0x0080) > 0);
                let noOverwrite = ((flags & 0x8000) > 0);
                let onlyOverwrite = ((flags & 0x4000) > 0);
                newOb.drawProperties = new Lemmings.DrawProperties(isUpsideDown, noOverwrite, onlyOverwrite, false);
                /// ignore empty items/objects
                if (flags == 0)
                    continue;
                this.objects.push(newOb);
            }
        }
        /** read the Level Obejcts */
        readLevelTerrain(fr) {
            /// reset array
            this.terrains = [];
            fr.setOffset(0x0120);
            for (var i = 0; i < 400; i++) {
                var newOb = new Lemmings.LevelElement();
                var v = fr.readInt(4);
                if (v == -1)
                    continue;
                newOb.x = ((v >> 16) & 0x0FFF) - 16;
                var y = ((v >> 7) & 0x01FF);
                newOb.y = y - ((y > 256) ? 516 : 4);
                newOb.id = (v & 0x003F);
                var flags = ((v >> 29) & 0x000F);
                let isUpsideDown = ((flags & 2) > 0);
                let noOverwrite = ((flags & 4) > 0);
                let isErase = ((flags & 1) > 0);
                newOb.drawProperties = new Lemmings.DrawProperties(isUpsideDown, noOverwrite, false, isErase);
                this.terrains.push(newOb);
            }
        }
        /** read Level Steel areas (Lemming can't pass) */
        readSteelArea(fr) {
            /// reset array
            this.steel = [];
            fr.setOffset(0x0760);
            for (var i = 0; i < 32; i++) {
                var newRange = new Lemmings.Range();
                var pos = fr.readWord();
                var size = fr.readByte();
                var unknown = fr.readByte();
                if ((pos == 0) && (size == 0))
                    continue;
                if (unknown != 0) {
                    this.log.log("Error in readSteelArea() : unknown != 0");
                    continue;
                }
                newRange.x = (pos & 0x01FF) * 4 - 16;
                newRange.y = ((pos >> 9) & 0x007F) * 4;
                newRange.width = (size & 0x0F) * 4 + 4;
                newRange.height = ((size >> 4) & 0x0F) * 4 + 4;
                this.steel.push(newRange);
            }
        }
        /** read general Level information */
        readLevelName(fr) {
            /// at the end of the 
            this.levelProperties.levelName = fr.readString(32, 0x07E0);
            this.log.debug("Level Name: " + this.levelProperties.levelName);
        }
    }
    Lemmings.LevelReader = LevelReader;
})(Lemmings || (Lemmings = {}));
/// <reference path="../file/binary-reader.ts" />
/// <reference path="../file/file-container.ts" />
var Lemmings;
(function (Lemmings) {
    /** The Odd Table has a list of LevelProperties to describe alternative starting conditions for a level  */
    class OddTableReader {
        constructor(oddfile) {
            this.levelProperties = [];
            this.log = new Lemmings.LogHandler("OddTableReader");
            this.read(oddfile);
        }
        /** return the Level for a given levelNumber - LevelNumber is counting all levels from first to last of the game
         *  Odd-Tables are only used for the "Original Lemmings" Game
         */
        getLevelProperties(levelNumber) {
            if ((levelNumber >= this.levelProperties.length) && (levelNumber < 0))
                return null;
            return this.levelProperties[levelNumber];
        }
        /** read the odd fine */
        read(fr) {
            fr.setOffset(0);
            /// count of levels definitions
            let count = Math.trunc(fr.length / 56);
            for (let i = 0; i < count; i++) {
                let prop = new Lemmings.LevelProperties();
                prop.releaseRate = fr.readWord();
                prop.releaseCount = fr.readWord();
                prop.needCount = fr.readWord();
                prop.timeLimit = fr.readWord();
                //- read amount of skills
                prop.skills[Lemmings.SkillTypes.CLIMBER] = fr.readWord();
                prop.skills[Lemmings.SkillTypes.FLOATER] = fr.readWord();
                prop.skills[Lemmings.SkillTypes.BOMBER] = fr.readWord();
                prop.skills[Lemmings.SkillTypes.BLOCKER] = fr.readWord();
                prop.skills[Lemmings.SkillTypes.BUILDER] = fr.readWord();
                prop.skills[Lemmings.SkillTypes.BASHER] = fr.readWord();
                prop.skills[Lemmings.SkillTypes.MINER] = fr.readWord();
                prop.skills[Lemmings.SkillTypes.DIGGER] = fr.readWord();
                prop.levelName = fr.readString(32);
                this.log.debug("Level (" + i + ") Name: " + prop.levelName + " " + prop.needCount + " " + prop.timeLimit);
                this.levelProperties.push(prop);
            }
            this.log.debug("levelProperties: " + this.levelProperties.length);
        }
    }
    Lemmings.OddTableReader = OddTableReader;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** convert the lemmings bit plain image format to real color-index-image data.
     * The lemmings file format uses multiple plains for every bit of color.
     * E.g. Save all lowest bits of the image in a chunk then all second bits... */
    class PaletteImage {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            let pixCount = this.width * this.height;
            this.pixBuf = new Uint8Array(pixCount);
        }
        /** return the image buffer */
        getImageBuffer() {
            return this.pixBuf;
        }
        /** convert to frame (colored image) */
        createFrame(palette, offsetX, offsetY) {
            /// convert color-index data to pixle image
            let resultFrame = new Lemmings.Frame(this.width, this.height, offsetX, offsetY);
            if (palette != null) {
                resultFrame.drawPaletteImage(this.pixBuf, this.width, this.height, palette, 0, 0);
            }
            return resultFrame;
        }
        /** convert the multi-bit-plain image to image */
        processImage(src, bitsPerPixle = 3, startPos) {
            let pixBuf = this.pixBuf;
            let pixCount = pixBuf.length;
            let bitBufLen = 0;
            let bitBuf = 0;
            if (startPos != null) {
                src.setOffset(startPos);
            }
            /// read image
            //- bits of a byte are stored separately
            for (var i = 0; i < bitsPerPixle; i++) {
                for (var p = 0; p < pixCount; p++) {
                    if (bitBufLen <= 0) {
                        bitBuf = src.readByte();
                        bitBufLen = 8;
                    }
                    pixBuf[p] = pixBuf[p] | ((bitBuf & 0x80) >> (7 - i));
                    bitBuf = (bitBuf << 1);
                    bitBufLen--;
                }
            }
            this.pixBuf = pixBuf;
        }
        /** use a color-index for the transparency in the image */
        processTransparentByColorIndex(transparentColorIndex) {
            let pixBuf = this.pixBuf;
            let pixCount = pixBuf.length;
            for (let i = 0; i < pixCount; i++) {
                if (pixBuf[i] == transparentColorIndex) {
                    /// Sets the highest bit to indicate the transparency.
                    pixBuf[i] = 0x80 | pixBuf[i];
                }
            }
        }
        /** use a bit plain for the transparency in the image */
        processTransparentData(src, startPos = 0) {
            let pixBuf = this.pixBuf;
            let pixCount = pixBuf.length;
            let bitBufLen = 0;
            let bitBuf = 0;
            if (startPos != null) {
                src.setOffset(startPos);
            }
            /// read image mask
            for (var p = 0; p < pixCount; p++) {
                if (bitBufLen <= 0) {
                    bitBuf = src.readByte();
                    bitBufLen = 8;
                }
                if ((bitBuf & 0x80) == 0) {
                    /// Sets the highest bit to indicate the transparency.
                    pixBuf[p] = 0x80 | pixBuf[p];
                }
                bitBuf = (bitBuf << 1);
                bitBufLen--;
            }
        }
    }
    Lemmings.PaletteImage = PaletteImage;
})(Lemmings || (Lemmings = {}));
/// <reference path="../file/binary-reader.ts" />
/// <reference path="../file/file-container.ts" />
var Lemmings;
(function (Lemmings) {
    /** read the VGASPECx.DAT file : it is a image used for the ground */
    class VgaspecReader {
        constructor(vgaspecFile, width, height) {
            this.log = new Lemmings.LogHandler("VgaspecReader");
            this.width = 0;
            this.height = 0;
            /** the color palette stored in this file */
            this.groundPalette = new Lemmings.ColorPalette();
            this.width = width;
            this.height = height;
            this.read(vgaspecFile);
        }
        /** read the file */
        read(fr) {
            fr.setOffset(0);
            let fc = new Lemmings.FileContainer(fr);
            if (fc.count() != 1) {
                this.log.log("No FileContainer found!");
                return;
            }
            /// we only need the first part
            fr = fc.getPart(0);
            /// read palette
            this.readPalettes(fr, 0);
            /// process the image
            this.readImage(fr, 40);
        }
        /** read image from file */
        readImage(fr, offset) {
            fr.setOffset(offset);
            let width = 960;
            let chunkHeight = 40;
            let groundImagePositionX = 304;
            this.img = new Lemmings.Frame(this.width, this.height);
            let startScanLine = 0;
            let pixelCount = width * chunkHeight;
            let bitBuffer = new Uint8Array(pixelCount);
            let bitBufferPos = 0;
            while (!fr.eof()) {
                let curByte = fr.readByte();
                if (curByte == 128) {
                    /// end of chunk
                    /// unpack image data to image-buffer
                    let fileReader = new Lemmings.BinaryReader(bitBuffer);
                    let bitImage = new Lemmings.PaletteImage(width, chunkHeight);
                    bitImage.processImage(fileReader, 3, 0);
                    bitImage.processTransparentByColorIndex(0);
                    this.img.drawPaletteImage(bitImage.getImageBuffer(), width, chunkHeight, this.groundPalette, groundImagePositionX, startScanLine);
                    startScanLine += 40;
                    if (startScanLine >= this.img.height)
                        return;
                    bitBufferPos = 0;
                }
                else if (curByte <= 127) {
                    let copyByteCount = curByte + 1;
                    /// copy copyByteCount to the bitImage
                    while (!fr.eof()) {
                        /// write the next Byte
                        if (bitBufferPos >= bitBuffer.length)
                            return;
                        bitBuffer[bitBufferPos] = fr.readByte();
                        bitBufferPos++;
                        copyByteCount--;
                        if (copyByteCount <= 0)
                            break;
                    }
                }
                else {
                    /// copy n times the same value
                    let repeatByte = fr.readByte();
                    for (let repeatByteCount = 257 - curByte; repeatByteCount > 0; repeatByteCount--) {
                        /// write the next Byte
                        if (bitBufferPos >= bitBuffer.length)
                            return;
                        bitBuffer[bitBufferPos] = repeatByte;
                        bitBufferPos++;
                    }
                }
            }
        }
        /** load the palettes  */
        readPalettes(fr, offset) {
            /// read the VGA palette index 0..8
            for (let i = 0; i < 8; i++) {
                let r = fr.readByte() << 2;
                let g = fr.readByte() << 2;
                let b = fr.readByte() << 2;
                this.groundPalette.setColorRGB(i, r, g, b);
            }
            if (fr.eof()) {
                this.log.log("readPalettes() : unexpected end of file!: " + fr.filename);
                return;
            }
        }
    }
    Lemmings.VgaspecReader = VgaspecReader;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class AudioPlayer {
        constructor(src, emulatorType) {
            this.log = new Lemmings.LogHandler("AudioPlayer");
            /** is the sound playing at the moment */
            this.isPlaying = false;
            /** processor task for generating sample */
            this.lenGen = 0;
            /// setup audio context
            this.audioCtx = new AudioContext();
            if (!this.audioCtx) {
                this.log.debug('Uanbel to create AudioContext!');
                return;
            }
            this.soundImagePlayer = src;
            this.log.debug("debug: " + this.soundImagePlayer.sampleRateFactor.toString(16));
            this.log.debug("Sound image sample rate factor: " + this.soundImagePlayer.sampleRateFactor + " --> " + this.soundImagePlayer.getSamplingInterval());
            this.log.debug('Audio sample rate ' + this.audioCtx.sampleRate);
            this.samplesPerTick = Math.round(this.audioCtx.sampleRate / (this.soundImagePlayer.getSamplingInterval()));
            this.source = this.audioCtx.createBufferSource();
            this.processor = this.audioCtx.createScriptProcessor(8192, 2, 2);
            // When the buffer source stops playing, disconnect everything
            this.source.onended = () => {
                // console.log('source.onended()');
                this.source.disconnect(this.processor);
                this.processor.disconnect(this.audioCtx.destination);
                this.processor = null;
                this.source = null;
            };
            this.setEmulatorType(emulatorType);
            /// setup Web-Audio
            this.processor.onaudioprocess = (e) => this.audioScriptProcessor(e);
            this.processor.connect(this.audioCtx.destination);
            this.source.connect(this.processor);
            this.source.start();
            this.play();
        }
        setEmulatorType(emulatorType) {
            /// create opl interpreter
            if (emulatorType == Lemmings.OplEmulatorType.Dosbox) {
                this.opl = new DBOPL.OPL(this.audioCtx.sampleRate, 2);
            }
            else {
                /// emulator only supports 49700 Hz
                this.opl = new Cozendey.OPL3();
            }
        }
        /** Start playback of the song/sound */
        play() {
            this.audioCtx.resume();
            this.isPlaying = true;
        }
        audioScriptProcessor(e) {
            var b = e.outputBuffer;
            var c0 = b.getChannelData(0);
            var c1 = b.getChannelData(1);
            let lenFill = b.length;
            let posFill = 0;
            while (posFill < lenFill) {
                // Fill any leftover delay from the last buffer-fill event first
                while (this.lenGen > 0) {
                    if (lenFill - posFill < 2) {
                        // No more space in buffer
                        return;
                    }
                    let lenNow = Math.max(2, Math.min(512, this.lenGen, lenFill - posFill));
                    const samples = this.opl.generate(lenNow);
                    for (let i = 0; i < lenNow; i++) {
                        c0[posFill] = samples[i * 2 + 0] / 32768.0;
                        c1[posFill] = samples[i * 2 + 1] / 32768.0;
                        posFill++;
                    }
                    this.lenGen -= lenNow;
                }
                /// read on music-state from source file
                this.soundImagePlayer.read((reg, value) => {
                    /// write Adlib-Commands
                    this.opl.write(reg, value);
                });
                this.lenGen += this.samplesPerTick;
            }
        }
        /** pause palying */
        suspend() {
            if (!this.audioCtx) {
                return;
            }
            this.audioCtx.suspend();
        }
        /** stop playing and close */
        stop() {
            if (this.isPlaying) {
                this.isPlaying = false;
            }
            try {
                this.audioCtx.close();
            }
            catch (ex) { }
            if (this.processor) {
                this.processor.onaudioprocess = null;
            }
            try {
                this.source.disconnect(this.processor);
            }
            catch (ex) { }
            this.audioCtx = null;
            this.source = null;
            this.processor = null;
            this.opl = null;
            this.soundImagePlayer = null;
        }
    }
    Lemmings.AudioPlayer = AudioPlayer;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    var OplEmulatorType;
    (function (OplEmulatorType) {
        OplEmulatorType[OplEmulatorType["Dosbox"] = 0] = "Dosbox";
        OplEmulatorType[OplEmulatorType["Cozendey"] = 1] = "Cozendey";
    })(OplEmulatorType = Lemmings.OplEmulatorType || (Lemmings.OplEmulatorType = {}));
})(Lemmings || (Lemmings = {}));
/// <reference path="../file/binary-reader.ts"/>
var Lemmings;
(function (Lemmings) {
    /** Class to read the Lemmings Sound Image File */
    class SoundImageManager {
        constructor(data, audioConfig) {
            this.data = data;
            this.fileConfig = audioConfig;
        }
        /** create a AdlibPlyer for a given music track number/index [0..N] */
        getMusicTrack(trackIndex) {
            var player = new Lemmings.SoundImagePlayer(this.data, this.fileConfig);
            player.initMusic(trackIndex);
            return player;
        }
        /** create a AdlibPlyer for a given sound index [0..N] */
        getSoundTrack(soundIndex) {
            var player = new Lemmings.SoundImagePlayer(this.data, this.fileConfig);
            player.initSound(soundIndex);
            return player;
        }
    }
    Lemmings.SoundImageManager = SoundImageManager;
})(Lemmings || (Lemmings = {}));
/// <reference path="../file/binary-reader.ts"/>
/// <reference path="sound-image-manager.ts"/>
var Lemmings;
(function (Lemmings) {
    var SoundImagChannelState;
    (function (SoundImagChannelState) {
        SoundImagChannelState[SoundImagChannelState["NONE"] = 0] = "NONE";
        SoundImagChannelState[SoundImagChannelState["SOUND"] = 1] = "SOUND";
        SoundImagChannelState[SoundImagChannelState["MUSIC"] = 2] = "MUSIC";
    })(SoundImagChannelState || (SoundImagChannelState = {}));
    /** interpreter for a channel of a song from a sound image file
     *  by calling 'read' its state is changes by procesing commands
     *  and as result OPL3 command are returned */
    class SoundImageChannels {
        constructor(reader, audioConfig) {
            this.waitTime = 0;
            this.waitSum = 0;
            this.programPointer = 0;
            this.channelPosition = 0;
            this.di00h = 0;
            this.di02h = 0;
            this.di04h = 0;
            this.di05h_h = 0;
            this.di05h_l = 0;
            this.di07h = 0;
            this.di08h_l = 0;
            this.di08h_h = 0;
            this.di0Fh = 0;
            this.di12h = 0;
            this.di13h = 0;
            this.unused = 0;
            /** only play if this is true */
            this.playingState = SoundImagChannelState.NONE;
            this.log = new Lemmings.LogHandler("AdliChannels");
            this.fileConfig = audioConfig;
            this.reader = new Lemmings.BinaryReader(reader);
        }
        /** read the channel data and write it to the callback */
        read(commandCallback) {
            if (this.playingState == SoundImagChannelState.NONE)
                return;
            this.waitTime--;
            let saveChannelPosition = this.channelPosition;
            if (this.waitTime <= 0) {
                if (this.soundImageVersion == 1) {
                    this.readBarVersion1(commandCallback);
                }
                else {
                    this.readBarVersion2(commandCallback);
                }
                return;
            }
            if (this.di13h != 0) {
                this.di00h = this.di00h + this.di13h;
                this.setFrequency(commandCallback);
            }
            if (this.reader.readByte(saveChannelPosition) != 0x82) {
                if (this.reader.readByte(this.di02h + 0xE) == this.waitTime) {
                    commandCallback(this.di08h_l, this.di08h_h);
                    this.di13h = 0;
                }
            }
        }
        readBarVersion1(commandCallback) {
            var cmdPos = this.channelPosition;
            while (true) {
                var cmd = this.reader.readByte(cmdPos);
                cmdPos++;
                if ((cmd & 0x80) == 0) {
                    this.setFrequencyHigh(commandCallback, cmd);
                    this.channelPosition = cmdPos;
                    return;
                }
                else if ((cmd >= 0xE0)) {
                    this.waitSum = (cmd - 0xDF);
                }
                else if ((cmd >= 0xC0)) {
                    this.setEnvelope(commandCallback, cmd - 0xC0);
                }
                else if ((cmd <= 0xB0)) {
                    cmdPos = this.part3(commandCallback, cmd, cmdPos);
                    if (cmdPos < 0)
                        return;
                }
                else {
                    this.setLevel(commandCallback, cmdPos);
                    cmdPos++;
                }
            }
        }
        readBarVersion2(commandCallback) {
            var cmdPos = this.channelPosition;
            while (true) {
                var cmd = this.reader.readByte(cmdPos);
                cmdPos++;
                if ((cmd & 0x80) == 0) {
                    this.setFrequencyHigh(commandCallback, cmd);
                    this.channelPosition = cmdPos;
                    return;
                }
                else if ((cmd >= 0xE0)) {
                    this.waitSum = (cmd - 0xDF);
                }
                else if ((cmd <= 0xA0)) {
                    cmdPos = this.part3(commandCallback, cmd, cmdPos);
                    if (cmdPos < 0)
                        return;
                }
                else {
                    this.setEnvelope(commandCallback, cmd - 0xA0);
                }
            }
        }
        setFrequencyHigh(commandCallback, cmd) {
            this.di00h = cmd;
            commandCallback(this.di08h_l, this.di08h_h);
            this.setFrequency(commandCallback);
            this.waitTime = this.waitSum;
        }
        setFrequency(commandCallback) {
            var mainPos = ((this.di00h + this.di12h) & 0xFF) + 4;
            var octave = this.reader.readByte(mainPos + this.fileConfig.octavesOffset);
            var frequenciesCount = this.reader.readByte(mainPos + this.fileConfig.frequenciesCountOffset);
            var frequency = this.reader.readWordBE(this.fileConfig.frequenciesOffset + frequenciesCount * 32);
            if ((frequency & 0x8000) == 0) {
                octave--;
            }
            if ((octave & 0x80) > 0) {
                octave++;
                frequency = frequency << 1; // * 2
            }
            /// write low part of frequency
            commandCallback(this.di07h + 0xA0, frequency & 0xFF);
            /// 0x3 : mask F-Number most sig.
            this.di08h_h = ((frequency >> 8) & 0x3) | ((octave << 2) & 0xFF);
            this.di08h_l = this.di07h + 0xB0;
            /// write high part of frequency
            /// 0x20 = set Key On
            commandCallback(this.di08h_l, this.di08h_h | 0x20);
        }
        setEnvelope(commandCallback, cmd) {
            var value;
            this.di04h = cmd;
            var pos = this.instrumentPos;
            if (this.playingState == SoundImagChannelState.SOUND) {
                pos = this.fileConfig.soundDataOffset;
            }
            pos = pos + ((cmd - 1) << 4);
            /// Attack Rate / Decay Rate
            value = this.reader.readByte(pos + 0);
            commandCallback(this.di05h_l + 0x60, value);
            value = this.reader.readByte(pos + 1);
            commandCallback(this.di05h_h + 0x60, value);
            /// Sustain Level / Release Rate
            value = this.reader.readByte(pos + 2);
            commandCallback(this.di05h_l + 0x80, value);
            value = this.reader.readByte(pos + 3);
            commandCallback(this.di05h_h + 0x80, value);
            /// Waveform Select
            value = this.reader.readByte(pos + 6);
            commandCallback(this.di05h_l + 0xE0, value);
            value = this.reader.readByte(pos + 7);
            commandCallback(this.di05h_h + 0xE0, value);
            /// 0xC0 -'
            value = this.reader.readByte(pos + 9);
            commandCallback(this.di07h + 0xC0, value);
            /// 0x20 -'
            value = this.reader.readByte(pos + 4);
            commandCallback(this.di05h_l + 0x20, value);
            value = this.reader.readByte(pos + 5);
            commandCallback(this.di05h_h + 0x20, value);
            /// other
            this.di12h = this.reader.readByte(pos + 8);
            this.di0Fh = this.reader.readByte(pos + 11);
            this.di02h = pos;
            this.setLevel(commandCallback, pos + 10);
        }
        part3(commandCallback, cmd, cmdPos) {
            switch (cmd & 0xF) {
                case 0:
                    var tmpPos = this.programPointer;
                    var cx = this.reader.readWordBE(tmpPos);
                    tmpPos += 2;
                    if (cx == 0) {
                        tmpPos = this.reader.readWordBE(tmpPos) + this.fileConfig.instructionsOffset;
                        cmdPos = this.reader.readWordBE(tmpPos) + this.fileConfig.instructionsOffset;
                        tmpPos += 2;
                    }
                    else {
                        cmdPos = cx + this.fileConfig.instructionsOffset;
                    }
                    this.programPointer = tmpPos;
                    this.channelPosition = cmdPos;
                    break;
                case 1:
                    /// Set frequency
                    commandCallback(this.di08h_l, this.di08h_h);
                    this.di13h = 0;
                    this.channelPosition = cmdPos;
                    this.waitTime = this.waitSum;
                    return -1;
                case 2:
                    this.channelPosition = cmdPos;
                    this.waitTime = this.waitSum;
                    return -1;
                case 3:
                    this.log.log("not implemented - end of song");
                    // Todo: 
                    ///-- reset all chanels ----
                    /*
                    for (var i:number = 0; i< this.channelCount; i++) {
          
                      commandCallback(this.di08h_l, this.di08h_h);
                      
                      this.playingState = AdliChannelsPlayingType.NONE;
                    }
          
                    */
                    return -1;
                case 4:
                    this.di12h = this.reader.readByte(cmdPos);
                    cmdPos++;
                    break;
                case 5:
                    commandCallback(this.di08h_l, this.di08h_h);
                    this.playingState = SoundImagChannelState.NONE;
                    return -1;
                case 6:
                    this.di13h = 1;
                    break;
                case 7:
                    this.di13h = 0xFF;
                    break;
                case 8:
                    this.setLevel(commandCallback, cmdPos);
                    cmdPos++;
                    break;
                default:
                    this.log.log("unknown command in part3");
            }
            return cmdPos;
        }
        setLevel(commandCallback, cmdPos) {
            var pos = this.reader.readByte(cmdPos);
            var ah = this.reader.readByte((pos & 0x7F) + this.fileConfig.dataOffset);
            var al = this.reader.readByte(this.di02h + 0xC);
            al = (al << 2) & 0xC0;
            ah = ah | al;
            commandCallback(this.di05h_l + 0x40, ah);
            pos = this.di0Fh + this.reader.readByte(this.di02h + 0xA) & 0x7F;
            ah = this.reader.readByte(pos + this.fileConfig.dataOffset);
            al = this.reader.readByte(this.di02h + 0xC);
            al = (al >> 2) & 0xC0;
            al = al & 0xC0;
            ah = ah | al;
            commandCallback(this.di05h_h + 0x40, ah);
        }
        /** init this channel for music */
        initMusic() {
            this.channelPosition = this.reader.readWordBE(this.programPointer) + this.fileConfig.instructionsOffset;
            /// move the programm pointer
            this.programPointer += 2;
            this.playingState = SoundImagChannelState.MUSIC;
        }
        /** init this channel for sound */
        initSound() {
            this.playingState = SoundImagChannelState.SOUND;
        }
        /** read the adlib config for this channel from the giffen offset */
        initChannel(offset, index) {
            offset = offset + index * 20; /// 20: sizeof(Channel-Init-Data)
            this.reader.setOffset(offset);
            /// read Cahnnel-Init-Data
            this.di00h = this.reader.readByte();
            this.waitTime = this.reader.readByte();
            this.di02h = this.reader.readWordBE();
            this.di04h = this.reader.readByte();
            this.di05h_l = this.reader.readByte();
            this.di05h_h = this.reader.readByte();
            this.di07h = this.reader.readByte();
            ;
            this.di08h_h = this.reader.readByte();
            this.di08h_l = this.reader.readByte();
            this.programPointer = this.reader.readWordBE();
            this.channelPosition = this.reader.readWordBE();
            this.unused = this.reader.readByte();
            this.di0Fh = this.reader.readByte();
            this.playingState = this.intToPlayingState(this.reader.readByte());
            this.waitSum = this.reader.readByte();
            this.di12h = this.reader.readByte();
            this.di13h = this.reader.readByte();
        }
        /** convert a number to a playState */
        intToPlayingState(stateVal) {
            switch (stateVal) {
                case 1:
                    return SoundImagChannelState.MUSIC;
                case 2:
                    return SoundImagChannelState.SOUND;
                default:
                    return SoundImagChannelState.NONE;
            }
        }
    }
    Lemmings.SoundImageChannels = SoundImageChannels;
})(Lemmings || (Lemmings = {}));
/// <reference path="../file/binary-reader.ts"/>
/// <reference path="sound-image-manager.ts"/>
var Lemmings;
(function (Lemmings) {
    ;
    /**
     * Player on a Lemmings SoundImage File to playback one track.
    */
    class SoundImagePlayer {
        constructor(reader, audioConfig) {
            this.audioConfig = audioConfig;
            this.log = new Lemmings.LogHandler("SoundImagePlayer");
            /** every track is composed of several channel. */
            this.channels = [];
            this.currentCycle = 0;
            /// are the init Commands send?
            this.initCommandsDone = false;
            /// create a new reader for the data
            this.reader = new Lemmings.BinaryReader(reader);
            this.fileConfig = audioConfig;
        }
        /** Return the samples to be generated */
        getSamplingInterval() {
            /// this is an empirical value... dont know if this is correct
            return this.sampleRateFactor / 210;
        }
        /** init for a sound */
        initSound(soundIndex) {
            ///- reset
            this.channels = [];
            this.channelCount = 0;
            this.waitCycles = 0;
            this.sampleRateFactor = 0x4300;
            /// check if valid
            if ((soundIndex < 0) || (soundIndex > 17))
                return;
            /// create channel : the original DOS Soundimage format player use channels >= 8 for sounds...but this shouldn't matter
            var ch = this.createChannel(8);
            ch.channelPosition = this.reader.readWordBE(this.fileConfig.soundIndexTablePosition + soundIndex * 2);
            ch.waitTime = 1;
            ch.di13h = 0;
            ch.initSound();
            /// add channel
            this.channels.push(ch);
            this.channelCount = 1;
        }
        /** init for a song */
        initMusic(musicIndex) {
            ///- reset
            this.channels = [];
            this.channelCount = 0;
            /// check if valid
            if (musicIndex < 0)
                return;
            musicIndex = musicIndex % this.fileConfig.numberOfTracks;
            this.songHeaderPosition = this.reader.readWordBE(this.fileConfig.instructionsOffset + musicIndex * 2);
            this.reader.setOffset(this.songHeaderPosition);
            this.sampleRateFactor = this.reader.readWordBE();
            this.instrumentPos = this.reader.readWordBE() + this.fileConfig.instructionsOffset;
            this.waitCycles = this.reader.readByte();
            this.channelCount = this.reader.readByte();
            /// create channels and set there programm position
            for (var i = 0; i < this.channelCount; i++) {
                /// create channels
                var ch = this.createChannel(i);
                /// config channel
                ch.programPointer = this.reader.readWordBE() + this.fileConfig.instructionsOffset;
                ch.instrumentPos = this.instrumentPos;
                ch.initMusic();
                this.channels.push(ch);
            }
            this.debug();
        }
        /** create an SoundImage Channel and init it */
        createChannel(chIndex) {
            var ch = new Lemmings.SoundImageChannels(this.reader, this.fileConfig);
            ch.initChannel(this.fileConfig.adlibChannelConfigPosition, chIndex);
            ch.waitTime = 1;
            ch.soundImageVersion = this.fileConfig.version;
            return ch;
        }
        /** reads the next block of data: call this to process the next data of this channel */
        read(commandCallback) {
            if (this.currentCycle > 0) {
                /// wait some time
                this.currentCycle--;
                return;
            }
            this.currentCycle = this.waitCycles;
            if (!this.initCommandsDone) {
                /// write the init adlib commands if this is the first call
                this.initCommandsDone = true;
                this.doInitTimer(commandCallback);
                this.doInitCommands(commandCallback);
            }
            /// read every channel
            for (var i = 0; i < this.channelCount; i++) {
                this.channels[i].read(commandCallback);
            }
        }
        /** Init the adlib timer */
        doInitTimer(commandCallback) {
            //- Masks Timer 1 and Masks Timer 2
            commandCallback(0x4, 0x60);
            //- Resets the flags for timers 1 & 2. If set, all other bits are ignored
            commandCallback(0x4, 0x80);
            //- Set Value of Timer 1.  The value for this timer is incremented every eighty (80) microseconds
            commandCallback(0x2, 0xFF);
            //- Masks Timer 2 and
            //- The value from byte 02 is loaded into Timer 1, and incrementation begins
            commandCallback(0x4, 0x21);
            //- Masks Timer 1 and Masks Timer 2
            commandCallback(0x4, 0x60);
            //- Resets the flags for timers 1 & 2. If set, all other bits are ignored
            commandCallback(0x4, 0x80);
        }
        /** Return the commands to init the adlib driver */
        doInitCommands(commandCallback) {
            for (var i = 0; i < this.channelCount; i++) {
                let ch = this.channels[i];
                commandCallback(ch.di08h_l, ch.di08h_h);
            }
            // enabled the FM chips to control the waveform of each operator
            commandCallback(0x01, 0x20);
            /// Set: AM depth is 4.8 dB
            /// Set: Vibrato depth is 14 cent
            commandCallback(0xBD, 0xC0);
            /// selects FM music mode
            ///  keyboard split off
            commandCallback(0x08, 0x00);
            /// Masks Timer 2
            /// the value from byte 02 is loaded into Timer 1, and incrementation begins. 
            commandCallback(0x04, 0x21);
        }
        /** write debug info to console */
        debug() {
            this.log.debug(this.fileConfig);
            this.log.debug("channelCount: " + this.channelCount);
            this.log.debug("songHeaderPosition: " + this.songHeaderPosition);
            this.log.debug("sampleRateFactor: " + this.sampleRateFactor);
            this.log.debug("waitCycles: " + this.waitCycles);
            this.log.debug("currentCycle: " + this.currentCycle);
            this.log.debug("instrumentPos: " + this.instrumentPos);
        }
    }
    Lemmings.SoundImagePlayer = SoundImagePlayer;
})(Lemmings || (Lemmings = {}));
/*
 * File: OPL3.java
 * Software implementation of the Yamaha YMF262 sound generator.
 * Copyright (C) 2008 Robson Cozendey <robson@cozendey.com>
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * One of the objectives of this emulator is to stimulate further research in the
 * OPL3 chip emulation. There was an explicit effort in making no optimizations,
 * and making the code as legible as possible, so that a new programmer
 * interested in modify and improve upon it could do so more easily.
 * This emulator's main body of information was taken from reverse engineering of
 * the OPL3 chip, from the YMF262 Datasheet and from the OPL3 section in the
 * YMF278b Application's Manual,
 * together with the vibrato table information, eighth waveform parameter
 * information and feedback averaging information provided in MAME's YMF262 and
 * YM3812 emulators, by Jarek Burczynski and Tatsuyuki Satoh.
 * This emulator has a high degree of accuracy, and most of music files sound
 * almost identical, exception made in some games which uses specific parts of
 * the rhythm section. In this respect, some parts of the rhythm mode are still
 * only an approximation of the real chip.
 * The other thing to note is that this emulator was done through recordings of
 * the SB16 DAC, so it has not bitwise precision. Additional equipment should be
 * used to verify the samples directly from the chip, and allow this exact
 * per-sample correspondence. As a good side-effect, since this emulator uses
 * floating point and has a more fine-grained envelope generator, it can produce
 * sometimes a crystal-clear, denser kind of OPL3 sound that, because of that,
 * may be useful for creating new music.
 *
 * Version 1.0.6
 *
 *
 * 2017 - Typescript Version: Thomas Zeugner
 */
var Cozendey;
(function (Cozendey) {
    class OPL3 {
        constructor() {
            this.registers = new Int32Array(0x200);
            this.channels2op = [[], []];
            this.channels4op = [[], []];
            this.nts = 0;
            this.dam = 0;
            this.dvb = 0;
            this.ryt = 0;
            this.bd = 0;
            this.sd = 0;
            this.tom = 0;
            this.tc = 0;
            this.hh = 0;
            this._new = 0;
            this.vibratoIndex = 0;
            this.tremoloIndex = 0;
            this.channels = [new Array(9), new Array(9)];
            this.initOperators();
            this.initChannels2op();
            this.initChannels4op();
            this.initRhythmChannels();
            this.initChannels();
        }
        /** The methods read() and write() are the only
        // ones needed by the user to interface with the emulator.
        // read() returns one frame at a time, to be played at 49700 Hz,
        // with each frame being four 16-bit samples,
        // corresponding to the OPL3 four output channels CHA...CHD. */
        read(bufferSize) {
            let output = [new Float32Array(bufferSize), new Float32Array(bufferSize)];
            let outputBuffer = new Float32Array(2);
            let channelOutput;
            for (let i = 0; i < bufferSize; i++) {
                for (let outputChannelNumber = 0; outputChannelNumber < 4; outputChannelNumber++)
                    outputBuffer[outputChannelNumber] = 0;
                // If _new = 0, use OPL2 mode with 9 channels. If _new = 1, use OPL3 18 channels;
                for (let array = 0; array < (this._new + 1); array++) {
                    for (let channelNumber = 0; channelNumber < 9; channelNumber++) {
                        // Reads output from each OPL3 channel, and accumulates it in the output buffer:
                        channelOutput = this.channels[array][channelNumber].getChannelOutput();
                        for (let outputChannelNumber = 0; outputChannelNumber < 4; outputChannelNumber++)
                            outputBuffer[outputChannelNumber] += channelOutput[outputChannelNumber];
                    }
                }
                // Normalizes the output buffer after all channels have been added,
                // with a maximum of 18 channels,
                // and multiplies it to get the 16 bit signed output.
                for (let outputChannelNumber = 0; outputChannelNumber < 4; outputChannelNumber++) {
                    output[outputChannelNumber][i] = (outputBuffer[outputChannelNumber] / 18 * 0x7FFF);
                }
                // Advances the OPL3-wide vibrato index, which is used by 
                // PhaseGenerator.getPhase() in each Operator.
                this.vibratoIndex++;
                if (this.vibratoIndex >= OPL3Data.vibratoTable[this.dvb].length)
                    this.vibratoIndex = 0;
                // Advances the OPL3-wide tremolo index, which is used by 
                // EnvelopeGenerator.getEnvelope() in each Operator.
                this.tremoloIndex++;
                if (this.tremoloIndex >= OPL3Data.tremoloTable[this.dam].length)
                    this.tremoloIndex = 0;
            }
            return output;
        }
        /** optimised JavaScript version of Read
         * returns one frame at a time, to be played at 49700 Hz,
        */
        generate(lenSamples) {
            let output = new Float32Array(lenSamples * 2);
            for (let i = 0; i < lenSamples; i++) {
                // Reads output from each OPL3 channel, and accumulates it in the output buffer:
                let outputValue0 = this.channels[0][0].getChannelOutput()[0];
                outputValue0 += this.channels[0][1].getChannelOutput()[0];
                outputValue0 += this.channels[0][2].getChannelOutput()[0];
                outputValue0 += this.channels[0][3].getChannelOutput()[0];
                outputValue0 += this.channels[0][4].getChannelOutput()[0];
                outputValue0 += this.channels[0][5].getChannelOutput()[0];
                outputValue0 += this.channels[0][6].getChannelOutput()[0];
                outputValue0 += this.channels[0][7].getChannelOutput()[0];
                outputValue0 += this.channels[0][8].getChannelOutput()[0];
                // Normalizes the output buffer after all channels have been added,
                // with a maximum of 9 channels,
                // and multiplies it to get the 16 bit signed output.
                /// to be compatible to the Dosbox version - add two chanels
                let result = outputValue0 * 7281.4;
                output[i * 2 + 0] = result;
                output[i * 2 + 1] = result;
                // Advances the OPL3-wide vibrato index, which is used by 
                // PhaseGenerator.getPhase() in each Operator.
                this.vibratoIndex++;
                if (this.vibratoIndex >= OPL3Data.vibratoTable[this.dvb].length)
                    this.vibratoIndex = 0;
                // Advances the OPL3-wide tremolo index, which is used by 
                // EnvelopeGenerator.getEnvelope() in each Operator.
                this.tremoloIndex++;
                if (this.tremoloIndex >= OPL3Data.tremoloTable[this.dam].length)
                    this.tremoloIndex = 0;
            }
            return output;
        }
        write(address, data) {
            let array = 0;
            // The OPL3 has two registers arrays, each with adresses ranging
            // from 0x00 to 0xF5.
            // This emulator uses one array, with the two original register arrays
            // starting at 0x00 and at 0x100.
            let registerAddress = (array << 8) | address;
            // If the address is out of the OPL3 memory map, returns.
            if (registerAddress < 0 || registerAddress >= 0x200)
                return;
            this.registers[registerAddress] = data;
            switch (address & 0xE0) {
                // The first 3 bits masking gives the type of the register by using its base address:
                // 0x00, 0x20, 0x40, 0x60, 0x80, 0xA0, 0xC0, 0xE0 
                // When it is needed, we further separate the register type inside each base address,
                // which is the case of 0x00 and 0xA0.
                // Through out this emulator we will use the same name convention to
                // reference a byte with several bit registers.
                // The name of each bit register will be followed by the number of bits
                // it occupies inside the byte. 
                // Numbers without accompanying names are unused bits.
                case 0x00:
                    // Unique registers for the entire OPL3:                
                    if (array == 1) {
                        if (address == 0x04)
                            this.update_2_CONNECTIONSEL6();
                        else if (address == 0x05)
                            this.update_7_NEW1();
                    }
                    else if (address == 0x08)
                        this.update_1_NTS1_6();
                    break;
                case 0xA0:
                    // 0xBD is a control register for the entire OPL3:
                    if (address == 0xBD) {
                        if (array == 0)
                            this.update_DAM1_DVB1_RYT1_BD1_SD1_TOM1_TC1_HH1();
                        break;
                    }
                    // Registers for each channel are in A0-A8, B0-B8, C0-C8, in both register arrays.
                    // 0xB0...0xB8 keeps kon,block,fnum(h) for each channel.
                    if ((address & 0xF0) == 0xB0 && address <= 0xB8) {
                        // If the address is in the second register array, adds 9 to the channel number.
                        // The channel number is given by the last four bits, like in A0,...,A8.
                        this.channels[array][address & 0x0F].update_2_KON1_BLOCK3_FNUMH2();
                        break;
                    }
                    // 0xA0...0xA8 keeps fnum(l) for each channel.
                    if ((address & 0xF0) == 0xA0 && address <= 0xA8)
                        this.channels[array][address & 0x0F].update_FNUML8();
                    break;
                // 0xC0...0xC8 keeps cha,chb,chc,chd,fb,cnt for each channel:
                case 0xC0:
                    if (address <= 0xC8)
                        this.channels[array][address & 0x0F].update_CHD1_CHC1_CHB1_CHA1_FB3_CNT1();
                    break;
                // Registers for each of the 36 Operators:
                default:
                    let operatorOffset = address & 0x1F;
                    if (this.operators[array][operatorOffset] == null)
                        break;
                    switch (address & 0xE0) {
                        // 0x20...0x35 keeps am,vib,egt,ksr,mult for each operator:                
                        case 0x20:
                            this.operators[array][operatorOffset].update_AM1_VIB1_EGT1_KSR1_MULT4();
                            break;
                        // 0x40...0x55 keeps ksl,tl for each operator: 
                        case 0x40:
                            this.operators[array][operatorOffset].update_KSL2_TL6();
                            break;
                        // 0x60...0x75 keeps ar,dr for each operator: 
                        case 0x60:
                            this.operators[array][operatorOffset].update_AR4_DR4();
                            break;
                        // 0x80...0x95 keeps sl,rr for each operator:
                        case 0x80:
                            this.operators[array][operatorOffset].update_SL4_RR4();
                            break;
                        // 0xE0...0xF5 keeps ws for each operator:
                        case 0xE0:
                            this.operators[array][operatorOffset].update_5_WS3();
                    }
            }
        }
        initOperators() {
            let baseAddress = 0;
            // The YMF262 has 36 operators:
            this.operators = [[], []]; //new Operator[2][0x20];
            for (let array = 0; array < 2; array++)
                for (let group = 0; group <= 0x10; group += 8)
                    for (let offset = 0; offset < 6; offset++) {
                        baseAddress = (array << 8) | (group + offset);
                        this.operators[array][group + offset] = new Operator(this, baseAddress);
                    }
            // Create specific operators to switch when in rhythm mode:
            this.highHatOperator = new HighHatOperator(this);
            this.snareDrumOperator = new SnareDrumOperator(this);
            this.tomTomOperator = new TomTomOperator(this);
            this.topCymbalOperator = new TopCymbalOperator(this);
            // Save operators when they are in non-rhythm mode:
            // Channel 7:
            this.highHatOperatorInNonRhythmMode = this.operators[0][0x11];
            this.snareDrumOperatorInNonRhythmMode = this.operators[0][0x14];
            // Channel 8:
            this.tomTomOperatorInNonRhythmMode = this.operators[0][0x12];
            this.topCymbalOperatorInNonRhythmMode = this.operators[0][0x15];
        }
        initChannels2op() {
            // The YMF262 has 18 2-op channels.
            // Each 2-op channel can be at a serial or parallel operator configuration:
            this.channels2op = [[], []]; //new Channel2op[2][9];
            for (let array = 0; array < 2; array++)
                for (let channelNumber = 0; channelNumber < 3; channelNumber++) {
                    let baseAddress = (array << 8) | channelNumber;
                    // Channels 1, 2, 3 -> Operator offsets 0x0,0x3; 0x1,0x4; 0x2,0x5
                    this.channels2op[array][channelNumber] = new Channel2op(this, baseAddress, this.operators[array][channelNumber], this.operators[array][channelNumber + 0x3]);
                    // Channels 4, 5, 6 -> Operator offsets 0x8,0xB; 0x9,0xC; 0xA,0xD
                    this.channels2op[array][channelNumber + 3] = new Channel2op(this, baseAddress + 3, this.operators[array][channelNumber + 0x8], this.operators[array][channelNumber + 0xB]);
                    // Channels 7, 8, 9 -> Operators 0x10,0x13; 0x11,0x14; 0x12,0x15
                    this.channels2op[array][channelNumber + 6] = new Channel2op(this, baseAddress + 6, this.operators[array][channelNumber + 0x10], this.operators[array][channelNumber + 0x13]);
                }
        }
        initChannels4op() {
            // The YMF262 has 3 4-op channels in each array:
            this.channels4op = [[], []]; //new Channel4op[2][3];
            for (let array = 0; array < 2; array++)
                for (let channelNumber = 0; channelNumber < 3; channelNumber++) {
                    let baseAddress = (array << 8) | channelNumber;
                    // Channels 1, 2, 3 -> Operators 0x0,0x3,0x8,0xB; 0x1,0x4,0x9,0xC; 0x2,0x5,0xA,0xD;
                    this.channels4op[array][channelNumber] = new Channel4op(this, baseAddress, this.operators[array][channelNumber], this.operators[array][channelNumber + 0x3], this.operators[array][channelNumber + 0x8], this.operators[array][channelNumber + 0xB]);
                }
        }
        initRhythmChannels() {
            this.bassDrumChannel = new BassDrumChannel(this);
            this.highHatSnareDrumChannel = new HighHatSnareDrumChannel(this);
            this.tomTomTopCymbalChannel = new TomTomTopCymbalChannel(this);
        }
        initChannels() {
            // Channel is an abstract class that can be a 2-op, 4-op, rhythm or disabled channel, 
            // depending on the OPL3 configuration at the time.
            // channels[] inits as a 2-op serial channel array:
            for (let array = 0; array < 2; array++)
                for (let i = 0; i < 9; i++)
                    this.channels[array][i] = this.channels2op[array][i];
            // Unique instance to fill future gaps in the Channel array,
            // when there will be switches between 2op and 4op mode.
            this.disabledChannel = new DisabledChannel(this);
        }
        update_1_NTS1_6() {
            let _1_nts1_6 = this.registers[OPL3Data._1_NTS1_6_Offset];
            // Note Selection. This register is used in Channel.updateOperators() implementations,
            // to calculate the channel´s Key Scale Number.
            // The value of the actual envelope rate follows the value of
            // OPL3.nts,Operator.keyScaleNumber and Operator.ksr
            this.nts = (_1_nts1_6 & 0x40) >> 6;
        }
        update_DAM1_DVB1_RYT1_BD1_SD1_TOM1_TC1_HH1() {
            let dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 = this.registers[OPL3Data.DAM1_DVB1_RYT1_BD1_SD1_TOM1_TC1_HH1_Offset];
            // Depth of amplitude. This register is used in EnvelopeGenerator.getEnvelope();
            this.dam = (dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 & 0x80) >> 7;
            // Depth of vibrato. This register is used in PhaseGenerator.getPhase();
            this.dvb = (dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 & 0x40) >> 6;
            let new_ryt = (dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 & 0x20) >> 5;
            if (new_ryt != this.ryt) {
                this.ryt = new_ryt;
                this.setRhythmMode();
            }
            let new_bd = (dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 & 0x10) >> 4;
            if (new_bd != this.bd) {
                this.bd = new_bd;
                if (this.bd == 1) {
                    this.bassDrumChannel.op1.keyOn();
                    this.bassDrumChannel.op2.keyOn();
                }
            }
            let new_sd = (dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 & 0x08) >> 3;
            if (new_sd != this.sd) {
                this.sd = new_sd;
                if (this.sd == 1)
                    this.snareDrumOperator.keyOn();
            }
            let new_tom = (dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 & 0x04) >> 2;
            if (new_tom != this.tom) {
                this.tom = new_tom;
                if (this.tom == 1)
                    this.tomTomOperator.keyOn();
            }
            let new_tc = (dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 & 0x02) >> 1;
            if (new_tc != this.tc) {
                this.tc = new_tc;
                if (this.tc == 1)
                    this.topCymbalOperator.keyOn();
            }
            let new_hh = dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 & 0x01;
            if (new_hh != this.hh) {
                this.hh = new_hh;
                if (this.hh == 1)
                    this.highHatOperator.keyOn();
            }
        }
        update_7_NEW1() {
            let _7_new1 = this.registers[OPL3Data._7_NEW1_Offset];
            // OPL2/OPL3 mode selection. This register is used in 
            // OPL3.read(), OPL3.write() and Operator.getOperatorOutput();
            this._new = (_7_new1 & 0x01);
            if (this._new == 1)
                this.setEnabledChannels();
            this.set4opConnections();
        }
        setEnabledChannels() {
            for (let array = 0; array < 2; array++)
                for (let i = 0; i < 9; i++) {
                    let baseAddress = this.channels[array][i].channelBaseAddress;
                    this.registers[baseAddress + ChannelData.CHD1_CHC1_CHB1_CHA1_FB3_CNT1_Offset] |= 0xF0;
                    this.channels[array][i].update_CHD1_CHC1_CHB1_CHA1_FB3_CNT1();
                }
        }
        update_2_CONNECTIONSEL6() {
            // This method is called only if _new is set.
            let _2_connectionsel6 = this.registers[OPL3Data._2_CONNECTIONSEL6_Offset];
            // 2-op/4-op channel selection. This register is used here to configure the OPL3.channels[] array.
            this.connectionsel = (_2_connectionsel6 & 0x3F);
            this.set4opConnections();
        }
        set4opConnections() {
            // bits 0, 1, 2 sets respectively 2-op channels (1,4), (2,5), (3,6) to 4-op operation.
            // bits 3, 4, 5 sets respectively 2-op channels (10,13), (11,14), (12,15) to 4-op operation.
            for (let array = 0; array < 2; array++)
                for (let i = 0; i < 3; i++) {
                    if (this._new == 1) {
                        let shift = array * 3 + i;
                        let connectionBit = (this.connectionsel >> shift) & 0x01;
                        if (connectionBit == 1) {
                            this.channels[array][i] = this.channels4op[array][i];
                            this.channels[array][i + 3] = this.disabledChannel;
                            this.channels[array][i].updateChannel();
                            continue;
                        }
                    }
                    this.channels[array][i] = this.channels2op[array][i];
                    this.channels[array][i + 3] = this.channels2op[array][i + 3];
                    this.channels[array][i].updateChannel();
                    this.channels[array][i + 3].updateChannel();
                }
        }
        setRhythmMode() {
            if (this.ryt == 1) {
                this.channels[0][6] = this.bassDrumChannel;
                this.channels[0][7] = this.highHatSnareDrumChannel;
                this.channels[0][8] = this.tomTomTopCymbalChannel;
                this.operators[0][0x11] = this.highHatOperator;
                this.operators[0][0x14] = this.snareDrumOperator;
                this.operators[0][0x12] = this.tomTomOperator;
                this.operators[0][0x15] = this.topCymbalOperator;
            }
            else {
                for (let i = 6; i <= 8; i++)
                    this.channels[0][i] = this.channels2op[0][i];
                this.operators[0][0x11] = this.highHatOperatorInNonRhythmMode;
                this.operators[0][0x14] = this.snareDrumOperatorInNonRhythmMode;
                this.operators[0][0x12] = this.tomTomOperatorInNonRhythmMode;
                this.operators[0][0x15] = this.topCymbalOperatorInNonRhythmMode;
            }
            for (let i = 6; i <= 8; i++)
                this.channels[0][i].updateChannel();
        }
    }
    Cozendey.OPL3 = OPL3;
    //
    // Channels
    //
    class Channel {
        constructor(opl, baseAddress) {
            this.opl = opl;
            this.fnuml = 0;
            this.fnumh = 0;
            this.kon = 0;
            this.block = 0;
            this.cha = 0;
            this.chb = 0;
            this.chc = 0;
            this.chd = 0;
            this.fb = 0;
            this.cnt = 0;
            // Factor to convert between normalized amplitude to normalized
            // radians. The amplitude maximum is equivalent to 8*Pi radians.
            this.toPhase = 4;
            this.channelBaseAddress = baseAddress;
            this.feedback = new Float32Array(2);
            this.feedback[0] = this.feedback[1] = 0;
        }
        update_2_KON1_BLOCK3_FNUMH2() {
            let _2_kon1_block3_fnumh2 = this.opl.registers[this.channelBaseAddress + ChannelData._2_KON1_BLOCK3_FNUMH2_Offset];
            // Frequency Number (hi-register) and Block. These two registers, together with fnuml, 
            // sets the Channel´s base frequency;
            this.block = (_2_kon1_block3_fnumh2 & 0x1C) >> 2;
            this.fnumh = _2_kon1_block3_fnumh2 & 0x03;
            this.updateOperators();
            // Key On. If changed, calls Channel.keyOn() / keyOff().
            let newKon = (_2_kon1_block3_fnumh2 & 0x20) >> 5;
            if (newKon != this.kon) {
                if (newKon == 1)
                    this.keyOn();
                else
                    this.keyOff();
                this.kon = newKon;
            }
        }
        update_FNUML8() {
            let fnuml8 = this.opl.registers[this.channelBaseAddress + ChannelData.FNUML8_Offset];
            // Frequency Number, low register.
            this.fnuml = fnuml8 & 0xFF;
            this.updateOperators();
        }
        update_CHD1_CHC1_CHB1_CHA1_FB3_CNT1() {
            let chd1_chc1_chb1_cha1_fb3_cnt1 = this.opl.registers[this.channelBaseAddress + ChannelData.CHD1_CHC1_CHB1_CHA1_FB3_CNT1_Offset];
            this.chd = (chd1_chc1_chb1_cha1_fb3_cnt1 & 0x80) >> 7;
            this.chc = (chd1_chc1_chb1_cha1_fb3_cnt1 & 0x40) >> 6;
            this.chb = (chd1_chc1_chb1_cha1_fb3_cnt1 & 0x20) >> 5;
            this.cha = (chd1_chc1_chb1_cha1_fb3_cnt1 & 0x10) >> 4;
            this.fb = (chd1_chc1_chb1_cha1_fb3_cnt1 & 0x0E) >> 1;
            this.cnt = chd1_chc1_chb1_cha1_fb3_cnt1 & 0x01;
            this.updateOperators();
        }
        updateChannel() {
            this.update_2_KON1_BLOCK3_FNUMH2();
            this.update_FNUML8();
            this.update_CHD1_CHC1_CHB1_CHA1_FB3_CNT1();
        }
        getInFourChannels(channelOutput) {
            let output = new Float32Array(4);
            if (this.opl._new == 0)
                output[0] = output[1] = output[2] = output[3] = channelOutput;
            else {
                output[0] = (this.cha == 1) ? channelOutput : 0;
                output[1] = (this.chb == 1) ? channelOutput : 0;
                output[2] = (this.chc == 1) ? channelOutput : 0;
                output[3] = (this.chd == 1) ? channelOutput : 0;
            }
            return output;
        }
    }
    class Channel2op extends Channel {
        constructor(opl, baseAddress, o1, o2) {
            super(opl, baseAddress);
            this.op1 = o1;
            this.op2 = o2;
        }
        getChannelOutput() {
            let channelOutput = 0, op1Output = 0, op2Output = 0;
            let output;
            // The feedback uses the last two outputs from
            // the first operator, instead of just the last one. 
            let feedbackOutput = (this.feedback[0] + this.feedback[1]) / 2;
            switch (this.cnt) {
                // CNT = 0, the operators are in series, with the first in feedback.
                case 0:
                    if (this.op2.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF)
                        return this.getInFourChannels(0);
                    op1Output = this.op1.getOperatorOutput(feedbackOutput);
                    channelOutput = this.op2.getOperatorOutput(op1Output * this.toPhase);
                    break;
                // CNT = 1, the operators are in parallel, with the first in feedback.    
                case 1:
                    if (this.op1.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF &&
                        this.op2.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF)
                        return this.getInFourChannels(0);
                    op1Output = this.op1.getOperatorOutput(feedbackOutput);
                    op2Output = this.op2.getOperatorOutput(Operator.noModulator);
                    channelOutput = (op1Output + op2Output) / 2;
            }
            this.feedback[0] = this.feedback[1];
            this.feedback[1] = (op1Output * ChannelData.feedback[this.fb]) % 1;
            output = this.getInFourChannels(channelOutput);
            return output;
        }
        keyOn() {
            this.op1.keyOn();
            this.op2.keyOn();
            this.feedback[0] = this.feedback[1] = 0;
        }
        keyOff() {
            this.op1.keyOff();
            this.op2.keyOff();
        }
        updateOperators() {
            // Key Scale Number, used in EnvelopeGenerator.setActualRates().
            let keyScaleNumber = this.block * 2 + ((this.fnumh >> this.opl.nts) & 0x01);
            let f_number = (this.fnumh << 8) | this.fnuml;
            this.op1.updateOperator(keyScaleNumber, f_number, this.block);
            this.op2.updateOperator(keyScaleNumber, f_number, this.block);
        }
        toString() {
            let str = "";
            let f_number = (this.fnumh << 8) + this.fnuml;
            str += "channelBaseAddress: %d\n", this.channelBaseAddress;
            str += "f_number: %d, block: %d\n", f_number, this.block;
            str += "cnt: %d, feedback: %d\n", this.cnt, this.fb;
            str += "op1:\n%s", this.op1.toString();
            str += "op2:\n%s", this.op2.toString();
            return str.toString();
        }
    }
    class Channel4op extends Channel {
        constructor(opl, baseAddress, o1, o2, o3, o4) {
            super(opl, baseAddress);
            this.op1 = o1;
            this.op2 = o2;
            this.op3 = o3;
            this.op4 = o4;
        }
        getChannelOutput() {
            let channelOutput = 0;
            let op1Output = 0;
            let op2Output = 0;
            let op3Output = 0;
            let op4Output = 0;
            let output;
            let secondChannelBaseAddress = this.channelBaseAddress + 3;
            let secondCnt = this.opl.registers[secondChannelBaseAddress + ChannelData.CHD1_CHC1_CHB1_CHA1_FB3_CNT1_Offset] & 0x1;
            let cnt4op = (this.cnt << 1) | secondCnt;
            let feedbackOutput = (this.feedback[0] + this.feedback[1]) / 2;
            switch (cnt4op) {
                case 0:
                    if (this.op4.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF)
                        return this.getInFourChannels(0);
                    op1Output = this.op1.getOperatorOutput(feedbackOutput);
                    op2Output = this.op2.getOperatorOutput(op1Output * this.toPhase);
                    op3Output = this.op3.getOperatorOutput(op2Output * this.toPhase);
                    channelOutput = this.op4.getOperatorOutput(op3Output * this.toPhase);
                    break;
                case 1:
                    if (this.op2.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF &&
                        this.op4.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF)
                        return this.getInFourChannels(0);
                    op1Output = this.op1.getOperatorOutput(feedbackOutput);
                    op2Output = this.op2.getOperatorOutput(op1Output * this.toPhase);
                    op3Output = this.op3.getOperatorOutput(Operator.noModulator);
                    op4Output = this.op4.getOperatorOutput(op3Output * this.toPhase);
                    channelOutput = (op2Output + op4Output) / 2;
                    break;
                case 2:
                    if (this.op1.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF &&
                        this.op4.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF)
                        return this.getInFourChannels(0);
                    op1Output = this.op1.getOperatorOutput(feedbackOutput);
                    op2Output = this.op2.getOperatorOutput(Operator.noModulator);
                    op3Output = this.op3.getOperatorOutput(op2Output * this.toPhase);
                    op4Output = this.op4.getOperatorOutput(op3Output * this.toPhase);
                    channelOutput = (op1Output + op4Output) / 2;
                    break;
                case 3:
                    if (this.op1.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF &&
                        this.op3.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF &&
                        this.op4.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF)
                        return this.getInFourChannels(0);
                    op1Output = this.op1.getOperatorOutput(feedbackOutput);
                    op2Output = this.op2.getOperatorOutput(Operator.noModulator);
                    op3Output = this.op3.getOperatorOutput(op2Output * this.toPhase);
                    op4Output = this.op4.getOperatorOutput(Operator.noModulator);
                    channelOutput = (op1Output + op3Output + op4Output) / 3;
            }
            this.feedback[0] = this.feedback[1];
            this.feedback[1] = (op1Output * ChannelData.feedback[this.fb]) % 1;
            output = this.getInFourChannels(channelOutput);
            return output;
        }
        keyOn() {
            this.op1.keyOn();
            this.op2.keyOn();
            this.op3.keyOn();
            this.op4.keyOn();
            this.feedback[0] = this.feedback[1] = 0;
        }
        keyOff() {
            this.op1.keyOff();
            this.op2.keyOff();
            this.op3.keyOff();
            this.op4.keyOff();
        }
        updateOperators() {
            // Key Scale Number, used in EnvelopeGenerator.setActualRates().
            let keyScaleNumber = this.block * 2 + ((this.fnumh >> this.opl.nts) & 0x01);
            let f_number = (this.fnumh << 8) | this.fnuml;
            this.op1.updateOperator(keyScaleNumber, f_number, this.block);
            this.op2.updateOperator(keyScaleNumber, f_number, this.block);
            this.op3.updateOperator(keyScaleNumber, f_number, this.block);
            this.op4.updateOperator(keyScaleNumber, f_number, this.block);
        }
        toString() {
            let str = "";
            let f_number = (this.fnumh << 8) + this.fnuml;
            str += "channelBaseAddress: %d\n", this.channelBaseAddress;
            str += "f_number: %d, block: %d\n", f_number, this.block;
            str += "cnt: %d, feedback: %d\n", this.cnt, this.fb;
            str += "op1:\n%s", this.op1.toString();
            str += "op2:\n%s", this.op2.toString();
            str += "op3:\n%s", this.op3.toString();
            str += "op4:\n%s", this.op4.toString();
            return str;
        }
    }
    /** There's just one instance of this class, that fills the eventual gaps in the Channel array; */
    class DisabledChannel extends Channel {
        constructor(opl) {
            super(opl, 0);
        }
        getChannelOutput() { return this.getInFourChannels(0); }
        keyOn() { }
        keyOff() { }
        updateOperators() { }
    }
    //
    // Operators
    //
    class Operator {
        constructor(opl, baseAddress) {
            this.opl = opl;
            this.envelope = 0;
            this.phase = 0;
            this.operatorBaseAddress = 0;
            this.am = 0;
            this.vib = 0;
            this.ksr = 0;
            this.egt = 0;
            this.mult = 0;
            this.ksl = 0;
            this.tl = 0;
            this.ar = 0;
            this.dr = 0;
            this.sl = 0;
            this.rr = 0;
            this.ws = 0;
            this.keyScaleNumber = 0;
            this.f_number = 0;
            this.block = 0;
            this.operatorBaseAddress = baseAddress;
            this.phaseGenerator = new PhaseGenerator(opl);
            this.envelopeGenerator = new EnvelopeGenerator(opl);
        }
        update_AM1_VIB1_EGT1_KSR1_MULT4() {
            let am1_vib1_egt1_ksr1_mult4 = this.opl.registers[this.operatorBaseAddress + OperatorData.AM1_VIB1_EGT1_KSR1_MULT4_Offset];
            // Amplitude Modulation. This register is used int EnvelopeGenerator.getEnvelope();
            this.am = (am1_vib1_egt1_ksr1_mult4 & 0x80) >> 7;
            // Vibrato. This register is used in PhaseGenerator.getPhase();
            this.vib = (am1_vib1_egt1_ksr1_mult4 & 0x40) >> 6;
            // Envelope Generator Type. This register is used in EnvelopeGenerator.getEnvelope();
            this.egt = (am1_vib1_egt1_ksr1_mult4 & 0x20) >> 5;
            // Key Scale Rate. Sets the actual envelope rate together with rate and keyScaleNumber.
            // This register os used in EnvelopeGenerator.setActualAttackRate().
            this.ksr = (am1_vib1_egt1_ksr1_mult4 & 0x10) >> 4;
            // Multiple. Multiplies the Channel.baseFrequency to get the Operator.operatorFrequency.
            // This register is used in PhaseGenerator.setFrequency().
            this.mult = am1_vib1_egt1_ksr1_mult4 & 0x0F;
            this.phaseGenerator.setFrequency(this.f_number, this.block, this.mult);
            this.envelopeGenerator.setActualAttackRate(this.ar, this.ksr, this.keyScaleNumber);
            this.envelopeGenerator.setActualDecayRate(this.dr, this.ksr, this.keyScaleNumber);
            this.envelopeGenerator.setActualReleaseRate(this.rr, this.ksr, this.keyScaleNumber);
        }
        update_KSL2_TL6() {
            let ksl2_tl6 = this.opl.registers[this.operatorBaseAddress + OperatorData.KSL2_TL6_Offset];
            // Key Scale Level. Sets the attenuation in accordance with the octave.
            this.ksl = (ksl2_tl6 & 0xC0) >> 6;
            // Total Level. Sets the overall damping for the envelope.
            this.tl = ksl2_tl6 & 0x3F;
            this.envelopeGenerator.setAtennuation(this.f_number, this.block, this.ksl);
            this.envelopeGenerator.setTotalLevel(this.tl);
        }
        update_AR4_DR4() {
            let ar4_dr4 = this.opl.registers[this.operatorBaseAddress + OperatorData.AR4_DR4_Offset];
            // Attack Rate.
            this.ar = (ar4_dr4 & 0xF0) >> 4;
            // Decay Rate.
            this.dr = ar4_dr4 & 0x0F;
            this.envelopeGenerator.setActualAttackRate(this.ar, this.ksr, this.keyScaleNumber);
            this.envelopeGenerator.setActualDecayRate(this.dr, this.ksr, this.keyScaleNumber);
        }
        update_SL4_RR4() {
            let sl4_rr4 = this.opl.registers[this.operatorBaseAddress + OperatorData.SL4_RR4_Offset];
            // Sustain Level.
            this.sl = (sl4_rr4 & 0xF0) >> 4;
            // Release Rate.
            this.rr = sl4_rr4 & 0x0F;
            this.envelopeGenerator.setActualSustainLevel(this.sl);
            this.envelopeGenerator.setActualReleaseRate(this.rr, this.ksr, this.keyScaleNumber);
        }
        update_5_WS3() {
            let _5_ws3 = this.opl.registers[this.operatorBaseAddress + OperatorData._5_WS3_Offset];
            this.ws = _5_ws3 & 0x07;
        }
        getOperatorOutput(modulator) {
            if (this.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF)
                return 0;
            let envelopeInDB = this.envelopeGenerator.getEnvelope(this.egt, this.am);
            this.envelope = Math.pow(10, envelopeInDB / 10.0);
            // If it is in OPL2 mode, use first four waveforms only:
            this.ws &= ((this.opl._new << 2) + 3);
            let waveform = OperatorData.waveforms[this.ws];
            this.phase = this.phaseGenerator.getPhase(this.vib);
            let operatorOutput = this.getOutput(modulator, this.phase, waveform);
            return operatorOutput;
        }
        getOutput(modulator, outputPhase, waveform) {
            outputPhase = (outputPhase + modulator) % 1;
            if (outputPhase < 0) {
                outputPhase++;
                // If the double could not afford to be less than 1:
                outputPhase %= 1;
            }
            let sampleIndex = (outputPhase * OperatorData.waveLength) | 0;
            return waveform[sampleIndex] * this.envelope;
        }
        keyOn() {
            if (this.ar > 0) {
                this.envelopeGenerator.keyOn();
                this.phaseGenerator.keyOn();
            }
            else
                this.envelopeGenerator.stage = EnvelopeGenerator.Stage.OFF;
        }
        keyOff() {
            this.envelopeGenerator.keyOff();
        }
        updateOperator(ksn, f_num, blk) {
            this.keyScaleNumber = ksn;
            this.f_number = f_num;
            this.block = blk;
            this.update_AM1_VIB1_EGT1_KSR1_MULT4();
            this.update_KSL2_TL6();
            this.update_AR4_DR4();
            this.update_SL4_RR4();
            this.update_5_WS3();
        }
        toString() {
            let str = "";
            let operatorFrequency = this.f_number * Math.pow(2, this.block - 1) * OPL3Data.sampleRate / Math.pow(2, 19) * OperatorData.multTable[this.mult];
            str += "operatorBaseAddress: %d\n", this.operatorBaseAddress;
            str += "operatorFrequency: %f\n", operatorFrequency;
            str += "mult: %d, ar: %d, dr: %d, sl: %d, rr: %d, ws: %d\n", this.mult, this.ar, this.dr, this.sl, this.rr, this.ws;
            str += "am: %d, vib: %d, ksr: %d, egt: %d, ksl: %d, tl: %d\n", this.am, this.vib, this.ksr, this.egt, this.ksl, this.tl;
            return str;
        }
    }
    Operator.noModulator = 0;
    //
    // Envelope Generator
    //
    class EnvelopeGenerator {
        constructor(opl) {
            this.opl = opl;
            this.stage = EnvelopeGenerator.Stage.OFF;
            this.actualAttackRate = 0;
            this.actualDecayRate = 0;
            this.xAttackIncrement = 0;
            this.xMinimumInAttack = 0;
            this.dBdecayIncrement = 0;
            this.dBreleaseIncrement = 0;
            this.attenuation = 0;
            this.totalLevel = 0;
            this.sustainLevel = 0;
            this.x = 0;
            this.envelope = 0;
            this.x = this.dBtoX(-96);
            this.envelope = -96;
        }
        setActualSustainLevel(sl) {
            // If all SL bits are 1, sustain level is set to -93 dB:
            if (sl == 0x0F) {
                this.sustainLevel = -93;
                return;
            }
            // The datasheet states that the SL formula is
            // sustainLevel = -24*d7 -12*d6 -6*d5 -3*d4,
            // translated as:
            this.sustainLevel = -3 * sl;
        }
        setTotalLevel(tl) {
            // The datasheet states that the TL formula is
            // TL = -(24*d5 + 12*d4 + 6*d3 + 3*d2 + 1.5*d1 + 0.75*d0),
            // translated as:
            this.totalLevel = tl * -0.75;
        }
        setAtennuation(f_number, block, ksl) {
            let hi4bits = (f_number >> 6) & 0x0F;
            switch (ksl) {
                case 0:
                    this.attenuation = 0;
                    break;
                case 1:
                    // ~3 dB/Octave
                    this.attenuation = OperatorData.ksl3dBtable[hi4bits][block];
                    break;
                case 2:
                    // ~1.5 dB/Octave
                    this.attenuation = OperatorData.ksl3dBtable[hi4bits][block] / 2;
                    break;
                case 3:
                    // ~6 dB/Octave
                    this.attenuation = OperatorData.ksl3dBtable[hi4bits][block] * 2;
            }
        }
        setActualAttackRate(attackRate, ksr, keyScaleNumber) {
            // According to the YMF278B manual's OPL3 section, the attack curve is exponential,
            // with a dynamic range from -96 dB to 0 dB and a resolution of 0.1875 dB 
            // per level.
            //
            // This method sets an attack increment and attack minimum value 
            // that creates a exponential dB curve with 'period0to100' seconds in length
            // and 'period10to90' seconds between 10% and 90% of the curve total level.
            this.actualAttackRate = this.calculateActualRate(attackRate, ksr, keyScaleNumber);
            let period0to100inSeconds = (EnvelopeGeneratorData.attackTimeValuesTable[this.actualAttackRate][0] / 1000);
            let period0to100inSamples = (period0to100inSeconds * OPL3Data.sampleRate) | 0;
            let period10to90inSeconds = (EnvelopeGeneratorData.attackTimeValuesTable[this.actualAttackRate][1] / 1000);
            let period10to90inSamples = (period10to90inSeconds * OPL3Data.sampleRate) | 0;
            // The x increment is dictated by the period between 10% and 90%:
            this.xAttackIncrement = OPL3Data.calculateIncrement(this.percentageToX(0.1), this.percentageToX(0.9), period10to90inSeconds);
            // Discover how many samples are still from the top.
            // It cannot reach 0 dB, since x is a logarithmic parameter and would be
            // negative infinity. So we will use -0.1875 dB as the resolution
            // maximum.
            //
            // percentageToX(0.9) + samplesToTheTop*xAttackIncrement = dBToX(-0.1875); ->
            // samplesToTheTop = (dBtoX(-0.1875) - percentageToX(0.9)) / xAttackIncrement); ->
            // period10to100InSamples = period10to90InSamples + samplesToTheTop; ->
            let period10to100inSamples = (period10to90inSamples + (this.dBtoX(-0.1875) - this.percentageToX(0.9)) / this.xAttackIncrement) | 0;
            // Discover the minimum x that, through the attackIncrement value, keeps 
            // the 10%-90% period, and reaches 0 dB at the total period:
            this.xMinimumInAttack = this.percentageToX(0.1) - (period0to100inSamples - period10to100inSamples) * this.xAttackIncrement;
        }
        setActualDecayRate(decayRate, ksr, keyScaleNumber) {
            this.actualDecayRate = this.calculateActualRate(decayRate, ksr, keyScaleNumber);
            let period10to90inSeconds = EnvelopeGeneratorData.decayAndReleaseTimeValuesTable[this.actualDecayRate][1] / 1000;
            // Differently from the attack curve, the decay/release curve is linear.        
            // The dB increment is dictated by the period between 10% and 90%:
            this.dBdecayIncrement = OPL3Data.calculateIncrement(this.percentageToDB(0.1), this.percentageToDB(0.9), period10to90inSeconds);
        }
        setActualReleaseRate(releaseRate, ksr, keyScaleNumber) {
            this.actualReleaseRate = this.calculateActualRate(releaseRate, ksr, keyScaleNumber);
            let period10to90inSeconds = EnvelopeGeneratorData.decayAndReleaseTimeValuesTable[this.actualReleaseRate][1] / 1000;
            this.dBreleaseIncrement = OPL3Data.calculateIncrement(this.percentageToDB(0.1), this.percentageToDB(0.9), period10to90inSeconds);
        }
        calculateActualRate(rate, ksr, keyScaleNumber) {
            let rof = EnvelopeGeneratorData.rateOffset[ksr][keyScaleNumber];
            let actualRate = rate * 4 + rof;
            // If, as an example at the maximum, rate is 15 and the rate offset is 15, 
            // the value would
            // be 75, but the maximum allowed is 63:
            if (actualRate > 63)
                actualRate = 63;
            return actualRate;
        }
        getEnvelope(egt, am) {
            // The datasheets attenuation values
            // must be halved to match the real OPL3 output.
            let envelopeSustainLevel = this.sustainLevel / 2;
            let envelopeTremolo = OPL3Data.tremoloTable[this.opl.dam][this.opl.tremoloIndex] / 2;
            let envelopeAttenuation = this.attenuation / 2;
            let envelopeTotalLevel = this.totalLevel / 2;
            let envelopeMinimum = -96;
            let envelopeResolution = 0.1875;
            let outputEnvelope;
            //
            // Envelope Generation
            //
            switch (this.stage) {
                case EnvelopeGenerator.Stage.ATTACK:
                    // Since the attack is exponential, it will never reach 0 dB, so
                    // we´ll work with the next to maximum in the envelope resolution.
                    if (this.envelope < -envelopeResolution && this.xAttackIncrement != -Infinity) {
                        // The attack is exponential.
                        this.envelope = -Math.pow(2, this.x);
                        this.x += this.xAttackIncrement;
                        break;
                    }
                    else {
                        // It is needed here to explicitly set envelope = 0, since
                        // only the attack can have a period of
                        // 0 seconds and produce an infinity envelope increment.
                        this.envelope = 0;
                        this.stage = EnvelopeGenerator.Stage.DECAY;
                    }
                case EnvelopeGenerator.Stage.DECAY:
                    // The decay and release are linear.                
                    if (this.envelope > envelopeSustainLevel) {
                        this.envelope -= this.dBdecayIncrement;
                        break;
                    }
                    else
                        this.stage = EnvelopeGenerator.Stage.SUSTAIN;
                case EnvelopeGenerator.Stage.SUSTAIN:
                    // The Sustain stage is mantained all the time of the Key ON,
                    // even if we are in non-sustaining mode.
                    // This is necessary because, if the key is still pressed, we can
                    // change back and forth the state of EGT, and it will release and
                    // hold again accordingly.
                    if (egt == 1)
                        break;
                    else {
                        if (this.envelope > envelopeMinimum)
                            this.envelope -= this.dBreleaseIncrement;
                        else
                            this.stage = EnvelopeGenerator.Stage.OFF;
                    }
                    break;
                case EnvelopeGenerator.Stage.RELEASE:
                    // If we have Key OFF, only here we are in the Release stage.
                    // Now, we can turn EGT back and forth and it will have no effect,i.e.,
                    // it will release inexorably to the Off stage.
                    if (this.envelope > envelopeMinimum)
                        this.envelope -= this.dBreleaseIncrement;
                    else
                        this.stage = EnvelopeGenerator.Stage.OFF;
            }
            // Ongoing original envelope
            outputEnvelope = this.envelope;
            //Tremolo
            if (am == 1)
                outputEnvelope += envelopeTremolo;
            //Attenuation
            outputEnvelope += envelopeAttenuation;
            //Total Level
            outputEnvelope += envelopeTotalLevel;
            return outputEnvelope;
        }
        keyOn() {
            // If we are taking it in the middle of a previous envelope, 
            // start to rise from the current level:
            // envelope = - (2 ^ x); ->
            // 2 ^ x = -envelope ->
            // x = log2(-envelope); ->
            let xCurrent = OperatorData.log2(-this.envelope);
            this.x = xCurrent < this.xMinimumInAttack ? xCurrent : this.xMinimumInAttack;
            this.stage = EnvelopeGenerator.Stage.ATTACK;
        }
        keyOff() {
            if (this.stage != EnvelopeGenerator.Stage.OFF)
                this.stage = EnvelopeGenerator.Stage.RELEASE;
        }
        dBtoX(dB) {
            return OperatorData.log2(-dB);
        }
        percentageToDB(percentage) {
            return Math.log10(percentage) * 10;
        }
        percentageToX(percentage) {
            return this.dBtoX(this.percentageToDB(percentage));
        }
        toString() {
            let str = "";
            str += "Envelope Generator: \n";
            let attackPeriodInSeconds = EnvelopeGeneratorData.attackTimeValuesTable[this.actualAttackRate][0] / 1000;
            str += "\tATTACK  %f s, rate %d. \n", attackPeriodInSeconds, this.actualAttackRate;
            let decayPeriodInSeconds = EnvelopeGeneratorData.decayAndReleaseTimeValuesTable[this.actualDecayRate][0] / 1000;
            str += "\tDECAY   %f s, rate %d. \n", decayPeriodInSeconds, this.actualDecayRate;
            str += "\tSL      %f dB. \n", this.sustainLevel;
            let releasePeriodInSeconds = EnvelopeGeneratorData.decayAndReleaseTimeValuesTable[this.actualReleaseRate][0] / 1000;
            str += "\tRELEASE %f s, rate %d. \n", releasePeriodInSeconds, this.actualReleaseRate;
            str += "\n";
            return str.toString();
        }
    }
    EnvelopeGenerator.INFINITY = null;
    (function (EnvelopeGenerator) {
        class Stage {
        }
        Stage.ATTACK = 'ATTACK';
        Stage.DECAY = 'DECAY';
        Stage.SUSTAIN = 'SUSTAIN';
        Stage.RELEASE = 'RELEASE';
        Stage.OFF = 'OFF';
        EnvelopeGenerator.Stage = Stage;
        ;
    })(EnvelopeGenerator || (EnvelopeGenerator = {}));
    //
    // Phase Generator
    //
    class PhaseGenerator {
        constructor(opl) {
            this.opl = opl;
            this.phase = 0;
            this.phaseIncrement = 0;
        }
        setFrequency(f_number, block, mult) {
            // This frequency formula is derived from the following equation:
            // f_number = baseFrequency * pow(2,19) / sampleRate / pow(2,block-1);        
            let baseFrequency = f_number * Math.pow(2, block - 1) * OPL3Data.sampleRate / Math.pow(2, 19);
            let operatorFrequency = baseFrequency * OperatorData.multTable[mult];
            // phase goes from 0 to 1 at 
            // period = (1/frequency) seconds ->
            // Samples in each period is (1/frequency)*sampleRate =
            // = sampleRate/frequency ->
            // So the increment in each sample, to go from 0 to 1, is:
            // increment = (1-0) / samples in the period -> 
            // increment = 1 / (OPL3Data.sampleRate/operatorFrequency) ->
            this.phaseIncrement = operatorFrequency / OPL3Data.sampleRate;
        }
        getPhase(vib) {
            if (vib == 1)
                // phaseIncrement = (operatorFrequency * vibrato) / sampleRate
                this.phase += this.phaseIncrement * OPL3Data.vibratoTable[this.opl.dvb][this.opl.vibratoIndex];
            else
                // phaseIncrement = operatorFrequency / sampleRate
                this.phase += this.phaseIncrement;
            this.phase %= 1;
            return this.phase;
        }
        keyOn() {
            this.phase = 0;
        }
        toString() {
            return "Operator frequency: " + OPL3Data.sampleRate * this.phaseIncrement + " Hz.\n";
        }
    }
    //
    // Rhythm
    //
    /** The getOperatorOutput() method in TopCymbalOperator, HighHatOperator and SnareDrumOperator
    // were made through purely empyrical reverse engineering of the OPL3 output. */
    class RhythmChannel extends Channel2op {
        constructor(opl, baseAddress, o1, o2) {
            super(opl, baseAddress, o1, o2);
        }
        getChannelOutput() {
            let channelOutput = 0;
            let op1Output = 0;
            let op2Output = 0;
            let output;
            // Note that, different from the common channel,
            // we do not check to see if the Operator's envelopes are Off.
            // Instead, we always do the calculations, 
            // to update the publicly available phase.
            op1Output = this.op1.getOperatorOutput(Operator.noModulator);
            op2Output = this.op2.getOperatorOutput(Operator.noModulator);
            channelOutput = (op1Output + op2Output) / 2;
            output = this.getInFourChannels(channelOutput);
            return output;
        }
        ;
        // Rhythm channels are always running, 
        // only the envelope is activated by the user.
        keyOn() { }
        ;
        keyOff() { }
        ;
    }
    class HighHatSnareDrumChannel extends RhythmChannel {
        constructor(opl) {
            super(opl, HighHatSnareDrumChannel.highHatSnareDrumChannelBaseAddress, opl.highHatOperator, opl.snareDrumOperator);
        }
    }
    HighHatSnareDrumChannel.highHatSnareDrumChannelBaseAddress = 7;
    class TomTomTopCymbalChannel extends RhythmChannel {
        constructor(opl) {
            super(opl, TomTomTopCymbalChannel.tomTomTopCymbalChannelBaseAddress, opl.tomTomOperator, opl.topCymbalOperator);
        }
    }
    TomTomTopCymbalChannel.tomTomTopCymbalChannelBaseAddress = 8;
    class TopCymbalOperator extends Operator {
        constructor(opl, baseAddress = 0x15) {
            super(opl, baseAddress);
        }
        getOperatorOutput(modulator) {
            let highHatOperatorPhase = this.opl.highHatOperator.phase * OperatorData.multTable[this.opl.highHatOperator.mult];
            // The Top Cymbal operator uses his own phase together with the High Hat phase.
            return this.getOperatorOutputEx(modulator, highHatOperatorPhase);
        }
        // This method is used here with the HighHatOperator phase
        // as the externalPhase. 
        // Conversely, this method is also used through inheritance by the HighHatOperator, 
        // now with the TopCymbalOperator phase as the externalPhase.
        getOperatorOutputEx(modulator, externalPhase) {
            let envelopeInDB = this.envelopeGenerator.getEnvelope(this.egt, this.am);
            this.envelope = Math.pow(10, envelopeInDB / 10.0);
            this.phase = this.phaseGenerator.getPhase(this.vib);
            let waveIndex = this.ws & ((this.opl._new << 2) + 3);
            let waveform = OperatorData.waveforms[waveIndex];
            // Empirically tested multiplied phase for the Top Cymbal:
            let carrierPhase = (8 * this.phase) % 1;
            let modulatorPhase = externalPhase;
            let modulatorOutput = this.getOutput(Operator.noModulator, modulatorPhase, waveform);
            let carrierOutput = this.getOutput(modulatorOutput, carrierPhase, waveform);
            let cycles = 4;
            if ((carrierPhase * cycles) % cycles > 0.1)
                carrierOutput = 0;
            return carrierOutput * 2;
        }
    }
    class HighHatOperator extends TopCymbalOperator {
        constructor(opl) {
            super(opl, HighHatOperator.highHatOperatorBaseAddress);
        }
        getOperatorOutput(modulator) {
            let topCymbalOperatorPhase = this.opl.topCymbalOperator.phase * OperatorData.multTable[this.opl.topCymbalOperator.mult];
            // The sound output from the High Hat resembles the one from
            // Top Cymbal, so we use the parent method and modifies his output
            // accordingly afterwards.
            let operatorOutput = super.getOperatorOutputEx(modulator, topCymbalOperatorPhase);
            if (operatorOutput == 0)
                operatorOutput = Math.random() * this.envelope;
            return operatorOutput;
        }
    }
    HighHatOperator.highHatOperatorBaseAddress = 0x11;
    class SnareDrumOperator extends Operator {
        constructor(opl) {
            super(opl, SnareDrumOperator.snareDrumOperatorBaseAddress);
        }
        getOperatorOutput(modulator) {
            if (this.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF)
                return 0;
            let envelopeInDB = this.envelopeGenerator.getEnvelope(this.egt, this.am);
            this.envelope = Math.pow(10, envelopeInDB / 10.0);
            // If it is in OPL2 mode, use first four waveforms only:
            let waveIndex = this.ws & ((this.opl._new << 2) + 3);
            let waveform = OperatorData.waveforms[waveIndex];
            this.phase = this.opl.highHatOperator.phase * 2;
            let operatorOutput = this.getOutput(modulator, this.phase, waveform);
            let noise = Math.random() * this.envelope;
            if (operatorOutput / this.envelope != 1 && operatorOutput / this.envelope != -1) {
                if (operatorOutput > 0)
                    operatorOutput = noise;
                else if (operatorOutput < 0)
                    operatorOutput = -noise;
                else
                    operatorOutput = 0;
            }
            return operatorOutput * 2;
        }
    }
    SnareDrumOperator.snareDrumOperatorBaseAddress = 0x14;
    class TomTomOperator extends Operator {
        constructor(opl) {
            super(opl, TomTomOperator.tomTomOperatorBaseAddress);
        }
    }
    TomTomOperator.tomTomOperatorBaseAddress = 0x12;
    class BassDrumChannel extends Channel2op {
        constructor(opl) {
            super(opl, BassDrumChannel.bassDrumChannelBaseAddress, new Operator(opl, BassDrumChannel.op1BaseAddress), new Operator(opl, BassDrumChannel.op2BaseAddress));
        }
        getChannelOutput() {
            // Bass Drum ignores first operator, when it is in series.
            if (this.cnt == 1)
                this.op1.ar = 0;
            return super.getChannelOutput();
        }
        // Key ON and OFF are unused in rhythm channels.
        keyOn() { }
        keyOff() { }
    }
    BassDrumChannel.bassDrumChannelBaseAddress = 6;
    BassDrumChannel.op1BaseAddress = 0x10;
    BassDrumChannel.op2BaseAddress = 0x13;
    //
    // OPl3 Data
    //
    class OPL3Data {
        static init() {
            this.loadVibratoTable();
            this.loadTremoloTable();
        }
        static loadVibratoTable() {
            // According to the YMF262 datasheet, the OPL3 vibrato repetition rate is 6.1 Hz.
            // According to the YMF278B manual, it is 6.0 Hz. 
            // The information that the vibrato table has 8 levels standing 1024 samples each
            // was taken from the emulator by Jarek Burczynski and Tatsuyuki Satoh,
            // with a frequency of 6,06689453125 Hz, what  makes sense with the difference 
            // in the information on the datasheets.
            // The first array is used when DVB=0 and the second array is used when DVB=1.
            this.vibratoTable = [new Float32Array(8192), new Float32Array(8192)];
            let semitone = Math.pow(2, 1 / 12);
            // A cent is 1/100 of a semitone:
            let cent = Math.pow(semitone, 1 / 100);
            // When dvb=0, the depth is 7 cents, when it is 1, the depth is 14 cents.
            let DVB0 = Math.pow(cent, 7);
            let DVB1 = Math.pow(cent, 14);
            let i;
            for (i = 0; i < 1024; i++)
                this.vibratoTable[0][i] = this.vibratoTable[1][i] = 1;
            for (; i < 2048; i++) {
                this.vibratoTable[0][i] = Math.sqrt(DVB0);
                this.vibratoTable[1][i] = Math.sqrt(DVB1);
            }
            for (; i < 3072; i++) {
                this.vibratoTable[0][i] = DVB0;
                this.vibratoTable[1][i] = DVB1;
            }
            for (; i < 4096; i++) {
                this.vibratoTable[0][i] = Math.sqrt(DVB0);
                this.vibratoTable[1][i] = Math.sqrt(DVB1);
            }
            for (; i < 5120; i++)
                this.vibratoTable[0][i] = this.vibratoTable[1][i] = 1;
            for (; i < 6144; i++) {
                this.vibratoTable[0][i] = 1 / Math.sqrt(DVB0);
                this.vibratoTable[1][i] = 1 / Math.sqrt(DVB1);
            }
            for (; i < 7168; i++) {
                this.vibratoTable[0][i] = 1 / DVB0;
                this.vibratoTable[1][i] = 1 / DVB1;
            }
            for (; i < 8192; i++) {
                this.vibratoTable[0][i] = 1 / Math.sqrt(DVB0);
                this.vibratoTable[1][i] = 1 / Math.sqrt(DVB1);
            }
        }
        static loadTremoloTable() {
            // The OPL3 tremolo repetition rate is 3.7 Hz.  
            let tremoloFrequency = 3.7;
            // The tremolo depth is -1 dB when DAM = 0, and -4.8 dB when DAM = 1.
            let tremoloDepth = [-1, -4.8];
            //  According to the YMF278B manual's OPL3 section graph, 
            //              the tremolo waveform is not 
            //   \      /   a sine wave, but a single triangle waveform.
            //    \    /    Thus, the period to achieve the tremolo depth is T/2, and      
            //     \  /     the increment in each T/2 section uses a frequency of 2*f.
            //      \/      Tremolo varies from 0 dB to depth, to 0 dB again, at frequency*2:
            let tremoloIncrement = [
                this.calculateIncrement(tremoloDepth[0], 0, 1 / (2 * tremoloFrequency)),
                this.calculateIncrement(tremoloDepth[1], 0, 1 / (2 * tremoloFrequency))
            ];
            let tremoloTableLength = (this.sampleRate / tremoloFrequency) | 0;
            // First array used when AM = 0 and second array used when AM = 1.
            this.tremoloTable = [new Float32Array(13432), new Float32Array(13432)];
            // This is undocumented. The tremolo starts at the maximum attenuation,
            // instead of at 0 dB:
            this.tremoloTable[0][0] = tremoloDepth[0];
            this.tremoloTable[1][0] = tremoloDepth[1];
            let counter = 0;
            // The first half of the triangle waveform:
            while (this.tremoloTable[0][counter] < 0) {
                counter++;
                this.tremoloTable[0][counter] = this.tremoloTable[0][counter - 1] + tremoloIncrement[0];
                this.tremoloTable[1][counter] = this.tremoloTable[1][counter - 1] + tremoloIncrement[1];
            }
            // The second half of the triangle waveform:
            while (this.tremoloTable[0][counter] > tremoloDepth[0] && counter < tremoloTableLength - 1) {
                counter++;
                this.tremoloTable[0][counter] = this.tremoloTable[0][counter - 1] - tremoloIncrement[0];
                this.tremoloTable[1][counter] = this.tremoloTable[1][counter - 1] - tremoloIncrement[1];
            }
        }
        static calculateIncrement(begin, end, period) {
            return (end - begin) / this.sampleRate * (1 / period);
        }
    }
    // OPL3-wide registers offsets:
    OPL3Data._1_NTS1_6_Offset = 0x08;
    OPL3Data.DAM1_DVB1_RYT1_BD1_SD1_TOM1_TC1_HH1_Offset = 0xBD;
    OPL3Data._7_NEW1_Offset = 0x105;
    OPL3Data._2_CONNECTIONSEL6_Offset = 0x104;
    OPL3Data.sampleRate = 49700;
    OPL3Data.init();
    //
    // Channel Data
    // 
    class ChannelData {
    }
    ChannelData._2_KON1_BLOCK3_FNUMH2_Offset = 0xB0;
    ChannelData.FNUML8_Offset = 0xA0;
    ChannelData.CHD1_CHC1_CHB1_CHA1_FB3_CNT1_Offset = 0xC0;
    // Feedback rate in fractions of 2*Pi, normalized to (0,1): 
    // 0, Pi/16, Pi/8, Pi/4, Pi/2, Pi, 2*Pi, 4*Pi turns to be:
    ChannelData.feedback = [0, 1 / 32, 1 / 16, 1 / 8, 1 / 4, 1 / 2, 1, 2];
    //
    // Operator Data
    //
    class OperatorData {
        static init() {
            OperatorData.loadWaveforms();
        }
        static loadWaveforms() {
            //OPL3 has eight waveforms:
            this.waveforms = [
                new Float32Array(1024), new Float32Array(1024), new Float32Array(1024), new Float32Array(1024),
                new Float32Array(1024), new Float32Array(1024), new Float32Array(1024), new Float32Array(1024)
            ];
            let i;
            // 1st waveform: sinusoid.
            let theta = 0, thetaIncrement = 2 * Math.PI / 1024;
            for (i = 0, theta = 0; i < 1024; i++, theta += thetaIncrement)
                this.waveforms[0][i] = Math.sin(theta);
            let sineTable = this.waveforms[0];
            // 2nd: first half of a sinusoid.
            for (i = 0; i < 512; i++) {
                this.waveforms[1][i] = sineTable[i];
                this.waveforms[1][512 + i] = 0;
            }
            // 3rd: double positive sinusoid.
            for (i = 0; i < 512; i++)
                this.waveforms[2][i] = this.waveforms[2][512 + i] = sineTable[i];
            // 4th: first and third quarter of double positive sinusoid.
            for (i = 0; i < 256; i++) {
                this.waveforms[3][i] = this.waveforms[3][512 + i] = sineTable[i];
                this.waveforms[3][256 + i] = this.waveforms[3][768 + i] = 0;
            }
            // 5th: first half with double frequency sinusoid.
            for (i = 0; i < 512; i++) {
                this.waveforms[4][i] = sineTable[i * 2];
                this.waveforms[4][512 + i] = 0;
            }
            // 6th: first half with double frequency positive sinusoid.
            for (i = 0; i < 256; i++) {
                this.waveforms[5][i] = this.waveforms[5][256 + i] = sineTable[i * 2];
                this.waveforms[5][512 + i] = this.waveforms[5][768 + i] = 0;
            }
            // 7th: square wave
            for (i = 0; i < 512; i++) {
                this.waveforms[6][i] = 1;
                this.waveforms[6][512 + i] = -1;
            }
            // 8th: exponential
            let x;
            let xIncrement = 1 * 16 / 256;
            for (i = 0, x = 0; i < 512; i++, x += xIncrement) {
                this.waveforms[7][i] = Math.pow(2, -x);
                this.waveforms[7][1023 - i] = -Math.pow(2, -(x + 1 / 16));
            }
        }
        static log2(x) {
            return Math.log(x) / Math.log(2);
        }
    }
    OperatorData.AM1_VIB1_EGT1_KSR1_MULT4_Offset = 0x20;
    OperatorData.KSL2_TL6_Offset = 0x40;
    OperatorData.AR4_DR4_Offset = 0x60;
    OperatorData.SL4_RR4_Offset = 0x80;
    OperatorData._5_WS3_Offset = 0xE0;
    OperatorData.waveLength = 1024;
    OperatorData.multTable = [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 12, 12, 15, 15];
    OperatorData.ksl3dBtable = [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, -3, -6, -9],
        [0, 0, 0, 0, -3, -6, -9, -12],
        [0, 0, 0, -1.875, -4.875, -7.875, -10.875, -13.875],
        [0, 0, 0, -3, -6, -9, -12, -15],
        [0, 0, -1.125, -4.125, -7.125, -10.125, -13.125, -16.125],
        [0, 0, -1.875, -4.875, -7.875, -10.875, -13.875, -16.875],
        [0, 0, -2.625, -5.625, -8.625, -11.625, -14.625, -17.625],
        [0, 0, -3, -6, -9, -12, -15, -18],
        [0, -0.750, -3.750, -6.750, -9.750, -12.750, -15.750, -18.750],
        [0, -1.125, -4.125, -7.125, -10.125, -13.125, -16.125, -19.125],
        [0, -1.500, -4.500, -7.500, -10.500, -13.500, -16.500, -19.500],
        [0, -1.875, -4.875, -7.875, -10.875, -13.875, -16.875, -19.875],
        [0, -2.250, -5.250, -8.250, -11.250, -14.250, -17.250, -20.250],
        [0, -2.625, -5.625, -8.625, -11.625, -14.625, -17.625, -20.625],
        [0, -3, -6, -9, -12, -15, -18, -21]
    ];
    OperatorData.init();
    (function (OperatorData) {
        class type {
        }
        type.NO_MODULATION = 'NO_MODULATION';
        type.CARRIER = 'CARRIER';
        type.FEEDBACK = 'FEEDBACK';
        OperatorData.type = type;
        ;
    })(OperatorData || (OperatorData = {}));
    //
    // Envelope Generator Data
    //
    class EnvelopeGeneratorData {
    }
    // This table is indexed by the value of Operator.ksr 
    // and the value of ChannelRegister.keyScaleNumber.
    EnvelopeGeneratorData.rateOffset = [
        [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3],
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    ];
    // These attack periods in miliseconds were taken from the YMF278B manual. 
    // The attack actual rates range from 0 to 63, with different data for 
    // 0%-100% and for 10%-90%: 
    EnvelopeGeneratorData.attackTimeValuesTable = [
        [Infinity, Infinity], [Infinity, Infinity], [Infinity, Infinity], [Infinity, Infinity],
        [2826.24, 1482.75], [2252.80, 1155.07], [1884.16, 991.23], [1597.44, 868.35],
        [1413.12, 741.38], [1126.40, 577.54], [942.08, 495.62], [798.72, 434.18],
        [706.56, 370.69], [563.20, 288.77], [471.04, 247.81], [399.36, 217.09],
        [353.28, 185.34], [281.60, 144.38], [235.52, 123.90], [199.68, 108.54],
        [176.76, 92.67], [140.80, 72.19], [117.76, 61.95], [99.84, 54.27],
        [88.32, 46.34], [70.40, 36.10], [58.88, 30.98], [49.92, 27.14],
        [44.16, 23.17], [35.20, 18.05], [29.44, 15.49], [24.96, 13.57],
        [22.08, 11.58], [17.60, 9.02], [14.72, 7.74], [12.48, 6.78],
        [11.04, 5.79], [8.80, 4.51], [7.36, 3.87], [6.24, 3.39],
        [5.52, 2.90], [4.40, 2.26], [3.68, 1.94], [3.12, 1.70],
        [2.76, 1.45], [2.20, 1.13], [1.84, 0.97], [1.56, 0.85],
        [1.40, 0.73], [1.12, 0.61], [0.92, 0.49], [0.80, 0.43],
        [0.70, 0.37], [0.56, 0.31], [0.46, 0.26], [0.42, 0.22],
        [0.38, 0.19], [0.30, 0.14], [0.24, 0.11], [0.20, 0.11],
        [0.00, 0.00], [0.00, 0.00], [0.00, 0.00], [0.00, 0.00]
    ];
    // These decay and release periods in miliseconds were taken from the YMF278B manual. 
    // The rate index range from 0 to 63, with different data for 
    // 0%-100% and for 10%-90%: 
    EnvelopeGeneratorData.decayAndReleaseTimeValuesTable = [
        [Infinity, Infinity], [Infinity, Infinity], [Infinity, Infinity], [Infinity, Infinity],
        [39280.64, 8212.48], [31416.32, 6574.08], [26173.44, 5509.12], [22446.08, 4730.88],
        [19640.32, 4106.24], [15708.16, 3287.04], [13086.72, 2754.56], [11223.04, 2365.44],
        [9820.16, 2053.12], [7854.08, 1643.52], [6543.36, 1377.28], [5611.52, 1182.72],
        [4910.08, 1026.56], [3927.04, 821.76], [3271.68, 688.64], [2805.76, 591.36],
        [2455.04, 513.28], [1936.52, 410.88], [1635.84, 344.34], [1402.88, 295.68],
        [1227.52, 256.64], [981.76, 205.44], [817.92, 172.16], [701.44, 147.84],
        [613.76, 128.32], [490.88, 102.72], [488.96, 86.08], [350.72, 73.92],
        [306.88, 64.16], [245.44, 51.36], [204.48, 43.04], [175.36, 36.96],
        [153.44, 32.08], [122.72, 25.68], [102.24, 21.52], [87.68, 18.48],
        [76.72, 16.04], [61.36, 12.84], [51.12, 10.76], [43.84, 9.24],
        [38.36, 8.02], [30.68, 6.42], [25.56, 5.38], [21.92, 4.62],
        [19.20, 4.02], [15.36, 3.22], [12.80, 2.68], [10.96, 2.32],
        [9.60, 2.02], [7.68, 1.62], [6.40, 1.35], [5.48, 1.15],
        [4.80, 1.01], [3.84, 0.81], [3.20, 0.69], [2.74, 0.58],
        [2.40, 0.51], [2.40, 0.51], [2.40, 0.51], [2.40, 0.51]
    ];
})(Cozendey || (Cozendey = {}));
/*
 *  Copyright (C) 2002-2015  The DOSBox Team
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 */
/*
* 2019 - Typescript Version: Thomas Zeugner
*/
var DBOPL;
(function (DBOPL) {
    class Channel {
        constructor(channels, thisChannel, operators, thisOpIndex) {
            this.old = new Int32Array(2);
            this.channels = channels;
            this.ChannelIndex = thisChannel;
            this.operators = operators;
            this.thisOpIndex = thisOpIndex;
            this.old[0] = this.old[1] = 0 | 0;
            this.chanData = 0 | 0;
            this.regB0 = 0 | 0;
            this.regC0 = 0 | 0;
            this.maskLeft = -1 | 0;
            this.maskRight = -1 | 0;
            this.feedback = 31 | 0;
            this.fourMask = 0 | 0;
            this.synthMode = DBOPL.SynthMode.sm2FM;
        }
        Channel(index) {
            return this.channels[this.ChannelIndex + index];
        }
        Op(index) {
            return this.operators[this.thisOpIndex + index];
        }
        SetChanData(chip, data /** Bit32u */) {
            let change = this.chanData ^ data;
            this.chanData = data;
            this.Op(0).chanData = data;
            this.Op(1).chanData = data;
            //Since a frequency update triggered this, always update frequency
            this.Op(0).UpdateFrequency();
            this.Op(1).UpdateFrequency();
            if ((change & (0xff << DBOPL.Shifts.SHIFT_KSLBASE)) != 0) {
                this.Op(0).UpdateAttenuation();
                this.Op(1).UpdateAttenuation();
            }
            if ((change & (0xff << DBOPL.Shifts.SHIFT_KEYCODE)) != 0) {
                this.Op(0).UpdateRates(chip);
                this.Op(1).UpdateRates(chip);
            }
        }
        UpdateFrequency(chip, fourOp /** UInt8 */) {
            //Extrace the frequency signed long
            let data = this.chanData & 0xffff;
            let kslBase = DBOPL.GlobalMembers.KslTable[data >>> 6];
            let keyCode = (data & 0x1c00) >>> 9;
            if ((chip.reg08 & 0x40) != 0) {
                keyCode |= (data & 0x100) >>> 8; /* notesel == 1 */
            }
            else {
                keyCode |= (data & 0x200) >>> 9; /* notesel == 0 */
            }
            //Add the keycode and ksl into the highest signed long of chanData
            data |= (keyCode << DBOPL.Shifts.SHIFT_KEYCODE) | (kslBase << DBOPL.Shifts.SHIFT_KSLBASE);
            this.Channel(0).SetChanData(chip, data);
            if ((fourOp & 0x3f) != 0) {
                this.Channel(1).SetChanData(chip, data);
            }
        }
        WriteA0(chip, val /* UInt8 */) {
            let fourOp = (chip.reg104 & chip.opl3Active & this.fourMask);
            //Don't handle writes to silent fourop channels
            if (fourOp > 0x80) {
                return;
            }
            let change = (this.chanData ^ val) & 0xff;
            if (change != 0) {
                this.chanData ^= change;
                this.UpdateFrequency(chip, fourOp);
            }
        }
        WriteB0(chip, val /* UInt8 */) {
            let fourOp = (chip.reg104 & chip.opl3Active & this.fourMask);
            //Don't handle writes to silent fourop channels
            if (fourOp > 0x80) {
                return;
            }
            let change = ((this.chanData ^ (val << 8)) & 0x1f00);
            if (change != 0) {
                this.chanData ^= change;
                this.UpdateFrequency(chip, fourOp);
            }
            //Check for a change in the keyon/off state
            if (((val ^ this.regB0) & 0x20) == 0) {
                return;
            }
            this.regB0 = val;
            if ((val & 0x20) != 0) {
                this.Op(0).KeyOn(0x1);
                this.Op(1).KeyOn(0x1);
                if ((fourOp & 0x3f) != 0) {
                    this.Channel(1).Op(0).KeyOn(1);
                    this.Channel(1).Op(1).KeyOn(1);
                }
            }
            else {
                this.Op(0).KeyOff(0x1);
                this.Op(1).KeyOff(0x1);
                if ((fourOp & 0x3f) != 0) {
                    this.Channel(1).Op(0).KeyOff(1);
                    this.Channel(1).Op(1).KeyOff(1);
                }
            }
        }
        WriteC0(chip, val /* UInt8 */) {
            let change = (val ^ this.regC0);
            if (change == 0) {
                return;
            }
            this.regC0 = val;
            this.feedback = ((val >>> 1) & 7);
            if (this.feedback != 0) {
                //We shift the input to the right 10 bit wave index value
                this.feedback = (9 - this.feedback) & 0xFF;
            }
            else {
                this.feedback = 31;
            }
            //Select the new synth mode
            if (chip.opl3Active) {
                //4-op mode enabled for this channel
                if (((chip.reg104 & this.fourMask) & 0x3f) != 0) {
                    let chan0;
                    let chan1;
                    //Check if it's the 2nd channel in a 4-op
                    if ((this.fourMask & 0x80) == 0) {
                        chan0 = this.Channel(0);
                        chan1 = this.Channel(1);
                    }
                    else {
                        chan0 = this.Channel(-1);
                        chan1 = this.Channel(0);
                    }
                    let synth = (((chan0.regC0 & 1) << 0) | ((chan1.regC0 & 1) << 1));
                    switch (synth) {
                        case 0:
                            //chan0.synthHandler = this.BlockTemplate<SynthMode.sm3FMFM>;
                            chan0.synthMode = DBOPL.SynthMode.sm3FMFM;
                            break;
                        case 1:
                            //chan0.synthHandler = this.BlockTemplate<SynthMode.sm3AMFM>;
                            chan0.synthMode = DBOPL.SynthMode.sm3AMFM;
                            break;
                        case 2:
                            //chan0.synthHandler = this.BlockTemplate<SynthMode.sm3FMAM>;
                            chan0.synthMode = DBOPL.SynthMode.sm3FMAM;
                            break;
                        case 3:
                            //chan0.synthHandler = this.BlockTemplate<SynthMode.sm3AMAM>;
                            chan0.synthMode = DBOPL.SynthMode.sm3AMAM;
                            break;
                    }
                    //Disable updating percussion channels
                }
                else if ((this.fourMask & 0x40) && (chip.regBD & 0x20)) {
                    //Regular dual op, am or fm
                }
                else if (val & 1) {
                    //this.synthHandler = this.BlockTemplate<SynthMode.sm3AM>;
                    this.synthMode = DBOPL.SynthMode.sm3AM;
                }
                else {
                    //this.synthHandler = this.BlockTemplate<SynthMode.sm3FM>;
                    this.synthMode = DBOPL.SynthMode.sm3FM;
                }
                this.maskLeft = (val & 0x10) != 0 ? -1 : 0;
                this.maskRight = (val & 0x20) != 0 ? -1 : 0;
                //opl2 active
            }
            else {
                //Disable updating percussion channels
                if ((this.fourMask & 0x40) != 0 && (chip.regBD & 0x20) != 0) {
                    //Regular dual op, am or fm
                }
                else if (val & 1) {
                    //this.synthHandler = this.BlockTemplate<SynthMode.sm2AM>;
                    this.synthMode = DBOPL.SynthMode.sm2AM;
                }
                else {
                    //this.synthHandler = this.BlockTemplate<SynthMode.sm2FM>;
                    this.synthMode = DBOPL.SynthMode.sm2FM;
                }
            }
        }
        ResetC0(chip) {
            let val = this.regC0;
            this.regC0 ^= 0xff;
            this.WriteC0(chip, val);
        }
        // template< bool opl3Mode> void Channel::GeneratePercussion( Chip* chip, Bit32s* output ) {
        GeneratePercussion(opl3Mode, chip, output /* Bit32s */, outputOffset) {
            let chan = this;
            //BassDrum
            let mod = ((this.old[0] + this.old[1])) >>> this.feedback;
            this.old[0] = this.old[1];
            this.old[1] = this.Op(0).GetSample(mod);
            //When bassdrum is in AM mode first operator is ignoed
            if ((chan.regC0 & 1) != 0) {
                mod = 0;
            }
            else {
                mod = this.old[0];
            }
            let sample = this.Op(1).GetSample(mod);
            //Precalculate stuff used by other outputs
            let noiseBit = chip.ForwardNoise() & 0x1;
            let c2 = this.Op(2).ForwardWave();
            let c5 = this.Op(5).ForwardWave();
            let phaseBit = (((c2 & 0x88) ^ ((c2 << 5) & 0x80)) | ((c5 ^ (c5 << 2)) & 0x20)) != 0 ? 0x02 : 0x00;
            //Hi-Hat
            let hhVol = this.Op(2).ForwardVolume();
            if (!((hhVol) >= ((12 * 256) >> (3 - ((9) - 9))))) {
                let hhIndex = (phaseBit << 8) | (0x34 << (phaseBit ^ (noiseBit << 1)));
                sample += this.Op(2).GetWave(hhIndex, hhVol);
            }
            //Snare Drum
            let sdVol = this.Op(3).ForwardVolume();
            if (!((sdVol) >= ((12 * 256) >> (3 - ((9) - 9))))) {
                let sdIndex = (0x100 + (c2 & 0x100)) ^ (noiseBit << 8);
                sample += this.Op(3).GetWave(sdIndex, sdVol);
            }
            //Tom-tom
            sample += this.Op(4).GetSample(0);
            //Top-Cymbal
            let tcVol = this.Op(5).ForwardVolume();
            if (!((tcVol) >= ((12 * 256) >> (3 - ((9) - 9))))) {
                let tcIndex = (1 + phaseBit) << 8;
                sample += this.Op(5).GetWave(tcIndex, tcVol);
            }
            sample <<= 1;
            if (opl3Mode) {
                output[outputOffset + 0] += sample;
                output[outputOffset + 1] += sample;
            }
            else {
                output[outputOffset + 0] += sample;
            }
        }
        /// template<SynthMode mode> Channel* Channel::BlockTemplate( Chip* chip, Bit32u samples, Bit32s* output ) 
        //public BlockTemplate(mode: SynthMode, chip: Chip, samples: number, output: Int32Array /** Bit32s* */): Channel {
        synthHandler(chip, samples, output, outputIndex /** Bit32s* */) {
            var mode = this.synthMode;
            switch (mode) {
                case DBOPL.SynthMode.sm2AM:
                case DBOPL.SynthMode.sm3AM:
                    if (this.Op(0).Silent() && this.Op(1).Silent()) {
                        this.old[0] = this.old[1] = 0;
                        return this.Channel(1);
                    }
                    break;
                case DBOPL.SynthMode.sm2FM:
                case DBOPL.SynthMode.sm3FM:
                    if (this.Op(1).Silent()) {
                        this.old[0] = this.old[1] = 0;
                        return this.Channel(1);
                    }
                    break;
                case DBOPL.SynthMode.sm3FMFM:
                    if (this.Op(3).Silent()) {
                        this.old[0] = this.old[1] = 0;
                        return this.Channel(2);
                    }
                    break;
                case DBOPL.SynthMode.sm3AMFM:
                    if (this.Op(0).Silent() && this.Op(3).Silent()) {
                        this.old[0] = this.old[1] = 0;
                        return this.Channel(2);
                    }
                    break;
                case DBOPL.SynthMode.sm3FMAM:
                    if (this.Op(1).Silent() && this.Op(3).Silent()) {
                        this.old[0] = this.old[1] = 0;
                        return this.Channel(2);
                    }
                    break;
                case DBOPL.SynthMode.sm3AMAM:
                    if (this.Op(0).Silent() && this.Op(2).Silent() && this.Op(3).Silent()) {
                        this.old[0] = this.old[1] = 0;
                        return this.Channel(2);
                    }
                    break;
            }
            //Init the operators with the the current vibrato and tremolo values
            this.Op(0).Prepare(chip);
            this.Op(1).Prepare(chip);
            if (mode > DBOPL.SynthMode.sm4Start) {
                this.Op(2).Prepare(chip);
                this.Op(3).Prepare(chip);
            }
            if (mode > DBOPL.SynthMode.sm6Start) {
                this.Op(4).Prepare(chip);
                this.Op(5).Prepare(chip);
            }
            for (let i = 0; i < samples; i++) {
                //Early out for percussion handlers
                if (mode == DBOPL.SynthMode.sm2Percussion) {
                    this.GeneratePercussion(false, chip, output, outputIndex + i);
                    continue; //Prevent some unitialized value bitching
                }
                else if (mode == DBOPL.SynthMode.sm3Percussion) {
                    this.GeneratePercussion(true, chip, output, outputIndex + i * 2);
                    continue; //Prevent some unitialized value bitching
                }
                //Do unsigned shift so we can shift out all signed long but still stay in 10 bit range otherwise
                let mod = ((this.old[0] + this.old[1])) >>> this.feedback;
                this.old[0] = this.old[1];
                this.old[1] = this.Op(0).GetSample(mod);
                let sample;
                let out0 = this.old[0];
                if (mode == DBOPL.SynthMode.sm2AM || mode == DBOPL.SynthMode.sm3AM) {
                    sample = out0 + this.Op(1).GetSample(0);
                }
                else if (mode == DBOPL.SynthMode.sm2FM || mode == DBOPL.SynthMode.sm3FM) {
                    sample = this.Op(1).GetSample(out0);
                }
                else if (mode == DBOPL.SynthMode.sm3FMFM) {
                    let next = this.Op(1).GetSample(out0);
                    next = this.Op(2).GetSample(next);
                    sample = this.Op(3).GetSample(next);
                }
                else if (mode == DBOPL.SynthMode.sm3AMFM) {
                    sample = out0;
                    let next = this.Op(1).GetSample(0);
                    next = this.Op(2).GetSample(next);
                    sample += this.Op(3).GetSample(next);
                }
                else if (mode == DBOPL.SynthMode.sm3FMAM) {
                    sample = this.Op(1).GetSample(out0);
                    let next = this.Op(2).GetSample(0);
                    sample += this.Op(3).GetSample(next);
                }
                else if (mode == DBOPL.SynthMode.sm3AMAM) {
                    sample = out0;
                    let next = this.Op(1).GetSample(0);
                    sample += this.Op(2).GetSample(next);
                    sample += this.Op(3).GetSample(0);
                }
                switch (mode) {
                    case DBOPL.SynthMode.sm2AM:
                    case DBOPL.SynthMode.sm2FM:
                        output[outputIndex + i] += sample;
                        break;
                    case DBOPL.SynthMode.sm3AM:
                    case DBOPL.SynthMode.sm3FM:
                    case DBOPL.SynthMode.sm3FMFM:
                    case DBOPL.SynthMode.sm3AMFM:
                    case DBOPL.SynthMode.sm3FMAM:
                    case DBOPL.SynthMode.sm3AMAM:
                        output[outputIndex + i * 2 + 0] += sample & this.maskLeft;
                        output[outputIndex + i * 2 + 1] += sample & this.maskRight;
                        break;
                }
            }
            switch (mode) {
                case DBOPL.SynthMode.sm2AM:
                case DBOPL.SynthMode.sm2FM:
                case DBOPL.SynthMode.sm3AM:
                case DBOPL.SynthMode.sm3FM:
                    return this.Channel(1);
                case DBOPL.SynthMode.sm3FMFM:
                case DBOPL.SynthMode.sm3AMFM:
                case DBOPL.SynthMode.sm3FMAM:
                case DBOPL.SynthMode.sm3AMAM:
                    return this.Channel(2);
                case DBOPL.SynthMode.sm2Percussion:
                case DBOPL.SynthMode.sm3Percussion:
                    return this.Channel(3);
            }
            return null;
        }
    }
    DBOPL.Channel = Channel;
})(DBOPL || (DBOPL = {}));
/*
 *  Copyright (C) 2002-2015  The DOSBox Team
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 */
/*
* 2019 - Typescript Version: Thomas Zeugner
*/
var DBOPL;
(function (DBOPL) {
    class Chip {
        constructor() {
            /// Frequency scales for the different multiplications
            this.freqMul = new Uint32Array(16);
            /// Rates for decay and release for rate of this chip
            this.linearRates = new Int32Array(76);
            /// Best match attack rates for the rate of this chip
            this.attackRates = new Int32Array(76);
            this.reg08 = 0;
            this.reg04 = 0;
            this.regBD = 0;
            this.reg104 = 0;
            this.opl3Active = 0;
            const ChannelCount = 18;
            this.chan = new Array(ChannelCount);
            this.op = new Array(2 * ChannelCount);
            for (let i = 0; i < this.op.length; i++) {
                this.op[i] = new DBOPL.Operator();
            }
            for (let i = 0; i < ChannelCount; i++) {
                this.chan[i] = new DBOPL.Channel(this.chan, i, this.op, i * 2);
            }
        }
        ForwardLFO(samples /* UInt32 */) {
            //Current vibrato value, runs 4x slower than tremolo
            this.vibratoSign = (DBOPL.GlobalMembers.VibratoTable[this.vibratoIndex >>> 2]) >> 7;
            this.vibratoShift = ((DBOPL.GlobalMembers.VibratoTable[this.vibratoIndex >>> 2] & 7) + this.vibratoStrength) | 0;
            this.tremoloValue = (DBOPL.GlobalMembers.TremoloTable[this.tremoloIndex] >>> this.tremoloStrength) | 0;
            //Check hom many samples there can be done before the value changes
            let todo = ((256 << (((32 - 10) - 10))) - this.lfoCounter) | 0;
            let count = ((todo + this.lfoAdd - 1) / this.lfoAdd) | 0;
            if (count > samples) {
                count = samples;
                this.lfoCounter += count * this.lfoAdd | 0;
            }
            else {
                this.lfoCounter += count * this.lfoAdd | 0;
                this.lfoCounter &= ((256 << (((32 - 10) - 10))) - 1);
                //Maximum of 7 vibrato value * 4
                this.vibratoIndex = (this.vibratoIndex + 1) & 31;
                //Clip tremolo to the the table size
                if (this.tremoloIndex + 1 < DBOPL.GlobalMembers.TREMOLO_TABLE) {
                    ++this.tremoloIndex;
                }
                else {
                    this.tremoloIndex = 0;
                }
            }
            return count;
        }
        ForwardNoise() {
            this.noiseCounter += this.noiseAdd;
            let count = (this.noiseCounter >>> ((32 - 10) - 10));
            this.noiseCounter &= ((1 << (32 - 10)) - 1);
            for (; count > 0; --count) {
                //Noise calculation from mame
                this.noiseValue ^= (0x800302) & (0 - (this.noiseValue & 1));
                this.noiseValue >>>= 1;
            }
            return this.noiseValue;
        }
        WriteBD(val /* UInt8 */) {
            let change = this.regBD ^ val;
            if (change == 0) {
                return;
            }
            this.regBD = val | 0;
            /// TODO could do this with shift and xor?
            this.vibratoStrength = ((val & 0x40) != 0 ? 0x00 : 0x01);
            this.tremoloStrength = ((val & 0x80) != 0 ? 0x00 : 0x02);
            if ((val & 0x20) != 0) {
                //Drum was just enabled, make sure channel 6 has the right synth
                if ((change & 0x20) != 0) {
                    if (this.opl3Active) {
                        //this.chan[6].synthHandler = & Channel.BlockTemplate < SynthMode.sm3Percussion >;
                        this.chan[6].synthMode = DBOPL.SynthMode.sm3Percussion;
                    }
                    else {
                        //this.chan[6].synthHandler = & Channel.BlockTemplate < SynthMode.sm2Percussion >;
                        this.chan[6].synthMode = DBOPL.SynthMode.sm2Percussion;
                    }
                }
                //Bass Drum
                if ((val & 0x10) != 0) {
                    this.chan[6].Op(0).KeyOn(0x2);
                    this.chan[6].Op(1).KeyOn(0x2);
                }
                else {
                    this.chan[6].Op(0).KeyOff(0x2);
                    this.chan[6].Op(1).KeyOff(0x2);
                }
                //Hi-Hat
                if ((val & 0x1) != 0) {
                    this.chan[7].Op(0).KeyOn(0x2);
                }
                else {
                    this.chan[7].Op(0).KeyOff(0x2);
                }
                //Snare
                if ((val & 0x8) != 0) {
                    this.chan[7].Op(1).KeyOn(0x2);
                }
                else {
                    this.chan[7].Op(1).KeyOff(0x2);
                }
                //Tom-Tom
                if ((val & 0x4) != 0) {
                    this.chan[8].Op(0).KeyOn(0x2);
                }
                else {
                    this.chan[8].Op(0).KeyOff(0x2);
                }
                //Top Cymbal
                if ((val & 0x2) != 0) {
                    this.chan[8].Op(1).KeyOn(0x2);
                }
                else {
                    this.chan[8].Op(1).KeyOff(0x2);
                }
            }
            else if (change & 0x20) {
                //Trigger a reset to setup the original synth handler
                this.chan[6].ResetC0(this);
                this.chan[6].Op(0).KeyOff(0x2);
                this.chan[6].Op(1).KeyOff(0x2);
                this.chan[7].Op(0).KeyOff(0x2);
                this.chan[7].Op(1).KeyOff(0x2);
                this.chan[8].Op(0).KeyOff(0x2);
                this.chan[8].Op(1).KeyOff(0x2);
            }
        }
        WriteReg(reg /* int */, val /** byte */) {
            let index = 0;
            switch ((reg & 0xf0) >>> 4) {
                case 0x00 >> 4:
                    if (reg == 0x01) {
                        this.waveFormMask = ((val & 0x20) != 0 ? 0x7 : 0x0);
                    }
                    else if (reg == 0x104) {
                        if (((this.reg104 ^ val) & 0x3f) == 0) {
                            return;
                        }
                        this.reg104 = (0x80 | (val & 0x3f));
                    }
                    else if (reg == 0x105) {
                        if (((this.opl3Active ^ val) & 1) == 0) {
                            return;
                        }
                        this.opl3Active = (val & 1) != 0 ? 0xff : 0;
                        for (let i = 0; i < 18; i++) {
                            this.chan[i].ResetC0(this);
                        }
                    }
                    else if (reg == 0x08) {
                        this.reg08 = val;
                    }
                case 0x10 >> 4:
                    break;
                case 0x20 >> 4:
                case 0x30 >> 4:
                    index = (((reg >>> 3) & 0x20) | (reg & 0x1f));
                    if (this.OpTable[index]) {
                        this.OpTable[index].Write20(this, val);
                    }
                    ;
                    break;
                case 0x40 >> 4:
                case 0x50 >> 4:
                    index = (((reg >>> 3) & 0x20) | (reg & 0x1f));
                    if (this.OpTable[index]) {
                        this.OpTable[index].Write40(this, val);
                    }
                    ;
                    break;
                case 0x60 >> 4:
                case 0x70 >> 4:
                    index = (((reg >>> 3) & 0x20) | (reg & 0x1f));
                    if (this.OpTable[index]) {
                        this.OpTable[index].Write60(this, val);
                    }
                    ;
                    break;
                case 0x80 >> 4:
                case 0x90 >> 4:
                    index = (((reg >>> 3) & 0x20) | (reg & 0x1f));
                    if (this.OpTable[index]) {
                        this.OpTable[index].Write80(this, val);
                    }
                    ;
                    break;
                case 0xa0 >> 4:
                    index = (((reg >>> 4) & 0x10) | (reg & 0xf));
                    if (this.ChanTable[index]) {
                        this.ChanTable[index].WriteA0(this, val);
                    }
                    ;
                    break;
                case 0xb0 >> 4:
                    if (reg == 0xbd) {
                        this.WriteBD(val);
                    }
                    else {
                        index = (((reg >>> 4) & 0x10) | (reg & 0xf));
                        if (this.ChanTable[index]) {
                            this.ChanTable[index].WriteB0(this, val);
                        }
                        ;
                    }
                    break;
                case 0xc0 >> 4:
                    index = (((reg >>> 4) & 0x10) | (reg & 0xf));
                    if (this.ChanTable[index]) {
                        this.ChanTable[index].WriteC0(this, val);
                    }
                    ;
                case 0xd0 >> 4:
                    break;
                case 0xe0 >> 4:
                case 0xf0 >> 4:
                    index = (((reg >>> 3) & 0x20) | (reg & 0x1f));
                    if (this.OpTable[index]) {
                        this.OpTable[index].WriteE0(this, val);
                    }
                    ;
                    break;
            }
        }
        WriteAddr(port /* UInt32 */, val /* byte */) {
            switch (port & 3) {
                case 0:
                    return val;
                case 2:
                    if (this.opl3Active || (val == 0x05)) {
                        return 0x100 | val;
                    }
                    else {
                        return val;
                    }
            }
            return 0;
        }
        GenerateBlock2(total /* UInt32 */, output /*  Int32 */) {
            let outputIndex = 0;
            while (total > 0) {
                let samples = this.ForwardLFO(total);
                //todo ?? do we need this
                //output.fill(0, outputIndex, outputIndex + samples);
                let ch = this.chan[0];
                while (ch.ChannelIndex < 9) {
                    //ch.printDebug();
                    ch = ch.synthHandler(this, samples, output, outputIndex);
                }
                total -= samples;
                outputIndex += samples;
            }
        }
        GenerateBlock3(total /* UInt32 */, output /* Int32 */) {
            let outputIndex = 0;
            while (total > 0) {
                let samples = this.ForwardLFO(total);
                output.fill(0, outputIndex, outputIndex + samples * 2);
                //int count = 0;
                for (let c = 0; c < 18; c++) {
                    //count++;
                    this.chan[c].synthHandler(this, samples, output, outputIndex);
                }
                total -= samples;
                outputIndex += samples * 2;
            }
        }
        Setup(rate /* UInt32 */) {
            this.InitTables();
            let scale = DBOPL.GlobalMembers.OPLRATE / rate;
            //Noise counter is run at the same precision as general waves
            this.noiseAdd = (0.5 + scale * (1 << ((32 - 10) - 10))) | 0;
            this.noiseCounter = 0 | 0;
            this.noiseValue = 1 | 0; //Make sure it triggers the noise xor the first time
            //The low frequency oscillation counter
            //Every time his overflows vibrato and tremoloindex are increased
            this.lfoAdd = (0.5 + scale * (1 << ((32 - 10) - 10))) | 0;
            this.lfoCounter = 0 | 0;
            this.vibratoIndex = 0 | 0;
            this.tremoloIndex = 0 | 0;
            //With higher octave this gets shifted up
            //-1 since the freqCreateTable = *2
            let freqScale = (0.5 + scale * (1 << ((32 - 10) - 1 - 10))) | 0;
            for (let i = 0; i < 16; i++) {
                this.freqMul[i] = (freqScale * DBOPL.GlobalMembers.FreqCreateTable[i]) | 0;
            }
            //-3 since the real envelope takes 8 steps to reach the single value we supply
            for (let i = 0; i < 76; i++) {
                let index = DBOPL.GlobalMembers.EnvelopeSelectIndex(i);
                let shift = DBOPL.GlobalMembers.EnvelopeSelectShift(i);
                this.linearRates[i] = (scale * (DBOPL.GlobalMembers.EnvelopeIncreaseTable[index] << (24 + ((9) - 9) - shift - 3))) | 0;
            }
            //Generate the best matching attack rate
            for (let i = 0; i < 62; i++) {
                let index = DBOPL.GlobalMembers.EnvelopeSelectIndex(i);
                let shift = DBOPL.GlobalMembers.EnvelopeSelectShift(i);
                //Original amount of samples the attack would take
                let original = ((DBOPL.GlobalMembers.AttackSamplesTable[index] << shift) / scale) | 0;
                let guessAdd = (scale * (DBOPL.GlobalMembers.EnvelopeIncreaseTable[index] << (24 - shift - 3))) | 0;
                let bestAdd = guessAdd;
                let bestDiff = 1 << 30;
                for (let passes = 0; passes < 16; passes++) {
                    let volume = (511 << ((9) - 9));
                    let samples = 0;
                    let count = 0;
                    while (volume > 0 && samples < original * 2) {
                        count += guessAdd;
                        let change = count >>> 24;
                        count &= ((1 << 24) - 1);
                        if ((change) != 0) {
                            volume += (~volume * change) >> 3;
                        }
                        samples++;
                    }
                    let diff = original - samples;
                    let lDiff = Math.abs(diff) | 0;
                    //Init last on first pass
                    if (lDiff < bestDiff) {
                        bestDiff = lDiff;
                        bestAdd = guessAdd;
                        if (bestDiff == 0) {
                            break;
                        }
                    }
                    //Below our target
                    if (diff < 0) {
                        //Better than the last time
                        let mul = (((original - diff) << 12) / original) | 0;
                        guessAdd = ((guessAdd * mul) >> 12);
                        guessAdd++;
                    }
                    else if (diff > 0) {
                        let mul = (((original - diff) << 12) / original) | 0;
                        guessAdd = (guessAdd * mul) >> 12;
                        guessAdd--;
                    }
                }
                this.attackRates[i] = bestAdd;
            }
            for (let i = 62; i < 76; i++) {
                //This should provide instant volume maximizing
                this.attackRates[i] = 8 << 24;
            }
            //Setup the channels with the correct four op flags
            //Channels are accessed through a table so they appear linear here
            this.chan[0].fourMask = (0x00 | (1 << 0));
            this.chan[1].fourMask = (0x80 | (1 << 0));
            this.chan[2].fourMask = (0x00 | (1 << 1));
            this.chan[3].fourMask = (0x80 | (1 << 1));
            this.chan[4].fourMask = (0x00 | (1 << 2));
            this.chan[5].fourMask = (0x80 | (1 << 2));
            this.chan[9].fourMask = (0x00 | (1 << 3));
            this.chan[10].fourMask = (0x80 | (1 << 3));
            this.chan[11].fourMask = (0x00 | (1 << 4));
            this.chan[12].fourMask = (0x80 | (1 << 4));
            this.chan[13].fourMask = (0x00 | (1 << 5));
            this.chan[14].fourMask = (0x80 | (1 << 5));
            //mark the percussion channels
            this.chan[6].fourMask = 0x40;
            this.chan[7].fourMask = 0x40;
            this.chan[8].fourMask = 0x40;
            //Clear Everything in opl3 mode
            this.WriteReg(0x105, 0x1);
            for (let i = 0; i < 512; i++) {
                if (i == 0x105) {
                    continue;
                }
                this.WriteReg(i, 0xff);
                this.WriteReg(i, 0x0);
            }
            this.WriteReg(0x105, 0x0);
            //Clear everything in opl2 mode
            for (let i = 0; i < 255; i++) {
                this.WriteReg(i, 0xff);
                this.WriteReg(i, 0x0);
            }
        }
        InitTables() {
            this.OpTable = new Array(DBOPL.GlobalMembers.OpOffsetTable.length);
            for (let i = 0; i < DBOPL.GlobalMembers.OpOffsetTable.length; i++) {
                this.OpTable[i] = this.op[DBOPL.GlobalMembers.OpOffsetTable[i]];
            }
            this.ChanTable = new Array(DBOPL.GlobalMembers.ChanOffsetTable.length);
            for (let i = 0; i < DBOPL.GlobalMembers.ChanOffsetTable.length; i++) {
                this.ChanTable[i] = this.chan[DBOPL.GlobalMembers.ChanOffsetTable[i]];
            }
        }
    }
    DBOPL.Chip = Chip;
})(DBOPL || (DBOPL = {}));
/*
 *  Copyright (C) 2002-2015  The DOSBox Team
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 */
/*
* 2019 - Typescript Version: Thomas Zeugner
*/
var DBOPL;
(function (DBOPL) {
    class GlobalMembers {
        static EnvelopeSelectShift(val /* UInt8  */) {
            if (val < 13 * 4) {
                return 12 - (val >>> 2);
            }
            else if (val < 15 * 4) {
                return 0;
            }
            else {
                return 0;
            }
        }
        static EnvelopeSelectIndex(val /* UInt8  */) {
            if (val < 13 * 4) {
                return (val & 3);
            }
            else if (val < 15 * 4) {
                return val - 12 * 4;
            }
            else {
                return 12;
            }
        }
        static InitTables() {
            if (GlobalMembers.doneTables) {
                return;
            }
            GlobalMembers.doneTables = true;
            /// Multiplication based tables
            for (let i = 0; i < 384; i++) {
                let s = i * 8;
                /// TODO maybe keep some of the precision errors of the original table?
                let val = (0.5 + (Math.pow(2.0, -1.0 + (255 - s) * (1.0 / 256))) * (1 << 16)) | 0;
                GlobalMembers.MulTable[i] = val;
            }
            //Sine Wave Base
            for (let i = 0; i < 512; i++) {
                GlobalMembers.WaveTable[0x0200 + i] = (Math.sin((i + 0.5) * (3.14159265358979323846 / 512.0)) * 4084) | 0;
                GlobalMembers.WaveTable[0x0000 + i] = -GlobalMembers.WaveTable[0x200 + i];
            }
            //Exponential wave
            for (let i = 0; i < 256; i++) {
                GlobalMembers.WaveTable[0x700 + i] = (0.5 + (Math.pow(2.0, -1.0 + (255 - i * 8) * (1.0 / 256))) * 4085) | 0;
                GlobalMembers.WaveTable[0x6ff - i] = -GlobalMembers.WaveTable[0x700 + i];
            }
            for (let i = 0; i < 256; i++) {
                /// Fill silence gaps
                GlobalMembers.WaveTable[0x400 + i] = GlobalMembers.WaveTable[0];
                GlobalMembers.WaveTable[0x500 + i] = GlobalMembers.WaveTable[0];
                GlobalMembers.WaveTable[0x900 + i] = GlobalMembers.WaveTable[0];
                GlobalMembers.WaveTable[0xc00 + i] = GlobalMembers.WaveTable[0];
                GlobalMembers.WaveTable[0xd00 + i] = GlobalMembers.WaveTable[0];
                /// Replicate sines in other pieces
                GlobalMembers.WaveTable[0x800 + i] = GlobalMembers.WaveTable[0x200 + i];
                /// double speed sines
                GlobalMembers.WaveTable[0xa00 + i] = GlobalMembers.WaveTable[0x200 + i * 2];
                GlobalMembers.WaveTable[0xb00 + i] = GlobalMembers.WaveTable[0x000 + i * 2];
                GlobalMembers.WaveTable[0xe00 + i] = GlobalMembers.WaveTable[0x200 + i * 2];
                GlobalMembers.WaveTable[0xf00 + i] = GlobalMembers.WaveTable[0x200 + i * 2];
            }
            /// Create the ksl table
            for (let oct = 0; oct < 8; oct++) {
                let base = (oct * 8) | 0;
                for (let i = 0; i < 16; i++) {
                    let val = base - GlobalMembers.KslCreateTable[i];
                    if (val < 0) {
                        val = 0;
                    }
                    /// *4 for the final range to match attenuation range
                    GlobalMembers.KslTable[oct * 16 + i] = (val * 4) | 0;
                }
            }
            /// Create the Tremolo table, just increase and decrease a triangle wave
            for (let i = 0; i < 52 / 2; i++) {
                let val = (i << ((9) - 9)) | 0;
                GlobalMembers.TremoloTable[i] = val;
                GlobalMembers.TremoloTable[52 - 1 - i] = val;
            }
            /// Create a table with offsets of the channels from the start of the chip
            for (let i = 0; i < 32; i++) {
                let index = (i & 0xf);
                if (index >= 9) {
                    GlobalMembers.ChanOffsetTable[i] = -1;
                    continue;
                }
                /// Make sure the four op channels follow eachother
                if (index < 6) {
                    index = ((index % 3) * 2 + ((index / 3) | 0)) | 0;
                }
                /// Add back the bits for highest ones
                if (i >= 16) {
                    index += 9;
                }
                GlobalMembers.ChanOffsetTable[i] = index;
            }
            /// Same for operators
            for (let i = 0; i < 64; i++) {
                if (i % 8 >= 6 || (((i / 8) | 0) % 4 == 3)) {
                    GlobalMembers.OpOffsetTable[i] = null;
                    continue;
                }
                let chNum = (((i / 8) | 0) * 3 + (i % 8) % 3) | 0;
                //Make sure we use 16 and up for the 2nd range to match the chanoffset gap
                if (chNum >= 12) {
                    chNum += 16 - 12;
                }
                let opNum = ((i % 8) / 3) | 0;
                if (GlobalMembers.ChanOffsetTable[chNum] == -1) {
                    GlobalMembers.OpOffsetTable[i] = -1;
                }
                else {
                    let c = GlobalMembers.ChanOffsetTable[chNum];
                    GlobalMembers.OpOffsetTable[i] = c * 2 + opNum;
                }
            }
        }
    }
    GlobalMembers.OPLRATE = (14318180.0 / 288.0); // double
    /// How much to substract from the base value for the final attenuation
    GlobalMembers.KslCreateTable = new Uint8Array([
        64, 32, 24, 19,
        16, 12, 11, 10,
        8, 6, 5, 4,
        3, 2, 1, 0
    ]); /* UInt8[]*/
    GlobalMembers.FreqCreateTable = new Uint8Array([
        (0.5 * 2), (1 * 2), (2 * 2), (3 * 2), (4 * 2), (5 * 2), (6 * 2), (7 * 2),
        (8 * 2), (9 * 2), (10 * 2), (10 * 2), (12 * 2), (12 * 2), (15 * 2), (15 * 2)
    ]); /** final UInt8[]  */
    /// We're not including the highest attack rate, that gets a special value
    GlobalMembers.AttackSamplesTable = new Uint8Array([
        69, 55, 46, 40,
        35, 29, 23, 20,
        19, 15, 11, 10,
        9
    ]); /** UInt8 */
    GlobalMembers.EnvelopeIncreaseTable = new Uint8Array([
        4, 5, 6, 7,
        8, 10, 12, 14,
        16, 20, 24, 28,
        32
    ]); /** UInt8 */
    /// Layout of the waveform table in 512 entry intervals
    /// With overlapping waves we reduce the table to half it's size
    /// 	|    |//\\|____|WAV7|//__|/\  |____|/\/\|
    /// 	|\\//|    |    |WAV7|    |  \/|    |    |
    /// 	|06  |0126|17  |7   |3   |4   |4 5 |5   |
    /// 6 is just 0 shifted and masked
    GlobalMembers.WaveTable = new Int16Array(8 * 512); /** Bit16s */
    GlobalMembers.WaveBaseTable = new Uint16Array([
        0x000, 0x200, 0x200, 0x800,
        0xa00, 0xc00, 0x100, 0x400
    ]); /** UInt16 */
    GlobalMembers.WaveMaskTable = new Uint16Array([
        1023, 1023, 511, 511,
        1023, 1023, 512, 1023
    ]); /** UInt16 */
    /// Where to start the counter on at keyon
    GlobalMembers.WaveStartTable = new Uint16Array([
        512, 0, 0, 0,
        0, 512, 512, 256
    ]); /** UInt16 */
    GlobalMembers.MulTable = new Uint16Array(384); /** UInt16[] */
    GlobalMembers.TREMOLO_TABLE = 52;
    GlobalMembers.KslTable = new Uint8Array(8 * 16); /** UInt8[] */
    GlobalMembers.TremoloTable = new Uint8Array(GlobalMembers.TREMOLO_TABLE); /** UInt8[] */
    //Start of a channel behind the chip struct start
    GlobalMembers.ChanOffsetTable = new Int16Array(32); /** UInt16[] */
    //Start of an operator behind the chip struct start
    GlobalMembers.OpOffsetTable = new Int16Array(64); /** UInt16[] */
    //The lower bits are the shift of the operator vibrato value
    //The highest bit is right shifted to generate -1 or 0 for negation
    //So taking the highest input value of 7 this gives 3, 7, 3, 0, -3, -7, -3, 0
    GlobalMembers.VibratoTable = new Int8Array([
        1 - 0x00, 0 - 0x00, 1 - 0x00, 30 - 0x00,
        1 - 0x80, 0 - 0x80, 1 - 0x80, 30 - 0x80
    ]); /** Int8 */
    //Shift strength for the ksl value determined by ksl strength
    GlobalMembers.KslShiftTable = new Uint8Array([31, 1, 2, 0]); /** UInt8 */
    GlobalMembers.doneTables = false;
    DBOPL.GlobalMembers = GlobalMembers;
})(DBOPL || (DBOPL = {}));
/*
 *  Copyright (C) 2002-2015  The DOSBox Team
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 */
/*
* 2019 - Typescript Version: Thomas Zeugner
*/
var DBOPL;
(function (DBOPL) {
    class Handler {
        constructor() {
            this.chip = new DBOPL.Chip();
        }
        WriteAddr(port /* int */, val /* byte */) {
            return this.chip.WriteAddr(port, val);
        }
        WriteReg(addr /* int */, val /* byte */) {
            this.chip.WriteReg(addr, val);
        }
        Generate(chan, samples /* short */) {
            let buffer = new Int32Array(512 * 2);
            if ((samples > 512)) {
                samples = 512;
            }
            if (!this.chip.opl3Active) {
                this.chip.GenerateBlock2(samples, buffer);
                chan.AddSamples_m32(samples, buffer);
            }
            else {
                this.chip.GenerateBlock3(samples, buffer);
                chan.AddSamples_s32(samples, buffer);
            }
        }
        Init(rate /* short */) {
            DBOPL.GlobalMembers.InitTables();
            this.chip.Setup(rate);
        }
    }
    DBOPL.Handler = Handler;
})(DBOPL || (DBOPL = {}));
/*
 *  Copyright (C) 2002-2015  The DOSBox Team
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 */
/*
* 2019 - Typescript Version: Thomas Zeugner
*/
var DBOPL;
(function (DBOPL) {
    class MixerChannel {
        constructor(buffer, channels) {
            this.buffer = buffer;
            this.channels = channels;
        }
        CLIP(v) {
            const SAMPLE_SIZE = 2;
            const SAMP_BITS = (SAMPLE_SIZE << 3);
            const SAMP_MAX = ((1 << (SAMP_BITS - 1)) - 1);
            const SAMP_MIN = -((1 << (SAMP_BITS - 1)));
            return (((v) > SAMP_MAX) ? SAMP_MAX : (((v) < SAMP_MIN) ? SAMP_MIN : (v)));
        }
        AddSamples_m32(samples, buffer) {
            // Volume amplication (0 == none, 1 == 2x, 2 == 4x)
            const VOL_AMP = 1;
            // Convert samples from mono int32 to stereo int16
            let out = this.buffer;
            let outIndex = 0;
            let ch = this.channels;
            if (ch == 2) {
                for (let i = 0; i < samples; i++) {
                    let v = this.CLIP(buffer[i] << VOL_AMP);
                    out[outIndex] = v;
                    outIndex++;
                    out[outIndex] = v;
                    outIndex++;
                }
            }
            else {
                for (let i = 0; i < samples; i++) {
                    let v = buffer[i] << VOL_AMP;
                    out[outIndex] = this.CLIP(v);
                    outIndex++;
                }
            }
            return;
        }
        AddSamples_s32(samples, buffer) {
            // Volume amplication (0 == none, 1 == 2x, 2 == 4x)
            const VOL_AMP = 1;
            // Convert samples from stereo s32 to stereo s16
            let out = this.buffer;
            let outIndex = 0;
            let ch = this.channels;
            if (ch == 2) {
                for (let i = 0; i < samples; i++) {
                    let v = buffer[i * 2] << VOL_AMP;
                    out[outIndex] = this.CLIP(v);
                    outIndex++;
                    v = buffer[i * 2 + 1] << VOL_AMP;
                    out[outIndex] = this.CLIP(v);
                    outIndex++;
                }
            }
            else {
                for (let i = 0; i < samples; i++) {
                    let v = buffer[i * 2] << VOL_AMP;
                    out[outIndex] = this.CLIP(v);
                    outIndex++;
                }
            }
            return;
        }
    }
    DBOPL.MixerChannel = MixerChannel;
})(DBOPL || (DBOPL = {}));
/*
 *  Copyright (C) 2002-2015  The DOSBox Team
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 */
/*
* 2019 - Typescript Version: Thomas Zeugner
*/
var DBOPL;
(function (DBOPL) {
    var Operator20Masks;
    (function (Operator20Masks) {
        Operator20Masks[Operator20Masks["MASK_KSR"] = 16] = "MASK_KSR";
        Operator20Masks[Operator20Masks["MASK_SUSTAIN"] = 32] = "MASK_SUSTAIN";
        Operator20Masks[Operator20Masks["MASK_VIBRATO"] = 64] = "MASK_VIBRATO";
        Operator20Masks[Operator20Masks["MASK_TREMOLO"] = 128] = "MASK_TREMOLO";
    })(Operator20Masks || (Operator20Masks = {}));
    var State;
    (function (State) {
        State[State["OFF"] = 0] = "OFF";
        State[State["RELEASE"] = 1] = "RELEASE";
        State[State["SUSTAIN"] = 2] = "SUSTAIN";
        State[State["DECAY"] = 3] = "DECAY";
        State[State["ATTACK"] = 4] = "ATTACK";
    })(State || (State = {}));
    class Operator {
        constructor() {
            this.chanData = 0 | 0;
            this.freqMul = 0 | 0;
            this.waveIndex = 0 >>> 0;
            this.waveAdd = 0 | 0;
            this.waveCurrent = 0 | 0;
            this.keyOn = 0 | 0;
            this.ksr = 0 | 0;
            this.reg20 = 0 | 0;
            this.reg40 = 0 | 0;
            this.reg60 = 0 | 0;
            this.reg80 = 0 | 0;
            this.regE0 = 0 | 0;
            this.SetState(State.OFF);
            this.rateZero = (1 << State.OFF);
            this.sustainLevel = (511 << ((9) - 9));
            this.currentLevel = (511 << ((9) - 9));
            this.totalLevel = (511 << ((9) - 9));
            this.volume = (511 << ((9) - 9));
            this.releaseAdd = 0;
        }
        SetState(s /** Int8 */) {
            this.state = s;
        }
        //We zero out when rate == 0
        UpdateAttack(chip) {
            let rate = this.reg60 >>> 4; /** UInt8 */
            if (rate != 0) {
                let val = ((rate << 2) + this.ksr) | 0; /** UInt8 */
                ;
                this.attackAdd = chip.attackRates[val];
                this.rateZero &= ~(1 << State.ATTACK);
            }
            else {
                this.attackAdd = 0;
                this.rateZero |= (1 << State.ATTACK);
            }
        }
        UpdateRelease(chip) {
            let rate = (this.reg80 & 0xf);
            if (rate != 0) {
                let val = ((rate << 2) + this.ksr) | 0;
                this.releaseAdd = chip.linearRates[val];
                this.rateZero &= ~(1 << State.RELEASE);
                if ((this.reg20 & Operator20Masks.MASK_SUSTAIN) == 0) {
                    this.rateZero &= ~(1 << State.SUSTAIN);
                }
            }
            else {
                this.rateZero |= (1 << State.RELEASE);
                this.releaseAdd = 0;
                if ((this.reg20 & Operator20Masks.MASK_SUSTAIN) == 0) {
                    this.rateZero |= (1 << State.SUSTAIN);
                }
            }
        }
        UpdateDecay(chip) {
            let rate = (this.reg60 & 0xf);
            if (rate != 0) {
                let val = ((rate << 2) + this.ksr) | 0;
                this.decayAdd = chip.linearRates[val];
                this.rateZero &= ~(1 << State.DECAY);
            }
            else {
                this.decayAdd = 0;
                this.rateZero |= (1 << State.DECAY);
            }
        }
        UpdateAttenuation() {
            let kslBase = ((this.chanData >>> DBOPL.Shifts.SHIFT_KSLBASE) & 0xff);
            let tl = this.reg40 & 0x3f;
            let kslShift = DBOPL.GlobalMembers.KslShiftTable[this.reg40 >>> 6];
            //Make sure the attenuation goes to the right Int32
            this.totalLevel = tl << ((9) - 7);
            this.totalLevel += (kslBase << ((9) - 9)) >> kslShift;
        }
        UpdateRates(chip) {
            //Mame seems to reverse this where enabling ksr actually lowers
            //the rate, but pdf manuals says otherwise?
            let newKsr = ((this.chanData >>> DBOPL.Shifts.SHIFT_KEYCODE) & 0xff);
            if ((this.reg20 & Operator20Masks.MASK_KSR) == 0) {
                newKsr >>>= 2;
            }
            if (this.ksr == newKsr) {
                return;
            }
            this.ksr = newKsr;
            this.UpdateAttack(chip);
            this.UpdateDecay(chip);
            this.UpdateRelease(chip);
        }
        UpdateFrequency() {
            let freq = this.chanData & ((1 << 10) - 1) | 0;
            let block = (this.chanData >>> 10) & 0xff;
            this.waveAdd = ((freq << block) * this.freqMul) | 0;
            if ((this.reg20 & Operator20Masks.MASK_VIBRATO) != 0) {
                this.vibStrength = (freq >>> 7) & 0xFF;
                this.vibrato = ((this.vibStrength << block) * this.freqMul) | 0;
            }
            else {
                this.vibStrength = 0;
                this.vibrato = 0;
            }
        }
        Write20(chip, val /** Int8 */) {
            let change = (this.reg20 ^ val);
            if (change == 0) {
                return;
            }
            this.reg20 = val;
            //Shift the tremolo bit over the entire register, saved a branch, YES!
            this.tremoloMask = ((val) >> 7) & 0xFF;
            this.tremoloMask &= ~((1 << ((9) - 9)) - 1);
            //Update specific features based on changes
            if ((change & Operator20Masks.MASK_KSR) != 0) {
                this.UpdateRates(chip);
            }
            //With sustain enable the volume doesn't change
            if ((this.reg20 & Operator20Masks.MASK_SUSTAIN) != 0 || (this.releaseAdd == 0)) {
                this.rateZero |= (1 << State.SUSTAIN);
            }
            else {
                this.rateZero &= ~(1 << State.SUSTAIN);
            }
            //Frequency multiplier or vibrato changed
            if ((change & (0xf | Operator20Masks.MASK_VIBRATO)) != 0) {
                this.freqMul = chip.freqMul[val & 0xf];
                this.UpdateFrequency();
            }
        }
        Write40(chip, val /** Int8 */) {
            if ((this.reg40 ^ val) == 0) {
                return;
            }
            this.reg40 = val;
            this.UpdateAttenuation();
        }
        Write60(chip, val /** Int8 */) {
            let change = (this.reg60 ^ val);
            this.reg60 = val;
            if ((change & 0x0f) != 0) {
                this.UpdateDecay(chip);
            }
            if ((change & 0xf0) != 0) {
                this.UpdateAttack(chip);
            }
        }
        Write80(chip, val /** Int8 */) {
            let change = (this.reg80 ^ val);
            if (change == 0) {
                return;
            }
            this.reg80 = val;
            let sustain = (val >>> 4);
            //Turn 0xf into 0x1f
            sustain |= (sustain + 1) & 0x10;
            this.sustainLevel = sustain << ((9) - 5);
            if ((change & 0x0f) != 0) {
                this.UpdateRelease(chip);
            }
        }
        WriteE0(chip, val /** Int8 */) {
            if ((this.regE0 ^ val) == 0) {
                return;
            }
            //in opl3 mode you can always selet 7 waveforms regardless of waveformselect
            let waveForm = (val & ((0x3 & chip.waveFormMask) | (0x7 & chip.opl3Active)));
            this.regE0 = val;
            //this.waveBase = GlobalMembers.WaveTable + GlobalMembers.WaveBaseTable[waveForm];
            this.waveBase = DBOPL.GlobalMembers.WaveBaseTable[waveForm];
            this.waveStart = (DBOPL.GlobalMembers.WaveStartTable[waveForm] << (32 - 10)) >>> 0;
            this.waveMask = DBOPL.GlobalMembers.WaveMaskTable[waveForm];
        }
        Silent() {
            if (!((this.totalLevel + this.volume) >= ((12 * 256) >> (3 - ((9) - 9))))) {
                return false;
            }
            if ((this.rateZero & (1 << this.state)) == 0) {
                return false;
            }
            return true;
        }
        Prepare(chip) {
            this.currentLevel = this.totalLevel + (chip.tremoloValue & this.tremoloMask);
            this.waveCurrent = this.waveAdd;
            if ((this.vibStrength >>> chip.vibratoShift) != 0) {
                let add = this.vibrato >>> chip.vibratoShift;
                //Sign extend over the shift value
                let neg = chip.vibratoSign;
                //Negate the add with -1 or 0
                add = ((add ^ neg) - neg);
                this.waveCurrent += add;
            }
        }
        KeyOn(mask /** Int8 */) {
            if (this.keyOn == 0) {
                //Restart the frequency generator
                this.waveIndex = this.waveStart;
                this.rateIndex = 0;
                this.SetState(State.ATTACK);
            }
            this.keyOn |= mask;
        }
        KeyOff(mask /** Int8 */) {
            this.keyOn &= ~mask;
            if (this.keyOn == 0) {
                if (this.state != State.OFF) {
                    this.SetState(State.RELEASE);
                }
            }
        }
        // public TemplateVolume(yes:State):number {
        TemplateVolume() {
            var yes = this.state;
            let vol = this.volume;
            let change;
            switch (yes) {
                case State.OFF:
                    return (511 << ((9) - 9));
                case State.ATTACK:
                    change = this.RateForward(this.attackAdd);
                    if (change == 0) {
                        return vol;
                    }
                    vol += ((~vol) * change) >> 3;
                    if (vol < 0) {
                        this.volume = 0;
                        this.rateIndex = 0;
                        this.SetState(State.DECAY);
                        return 0;
                    }
                    break;
                case State.DECAY:
                    vol += this.RateForward(this.decayAdd);
                    if ((vol >= this.sustainLevel)) {
                        //Check if we didn't overshoot max attenuation, then just go off
                        if ((vol >= (511 << ((9) - 9)))) {
                            this.volume = (511 << ((9) - 9));
                            this.SetState(State.OFF);
                            return (511 << ((9) - 9));
                        }
                        //Continue as sustain
                        this.rateIndex = 0;
                        this.SetState(State.SUSTAIN);
                    }
                    break;
                case State.SUSTAIN:
                    if ((this.reg20 & Operator20Masks.MASK_SUSTAIN) != 0) {
                        return vol;
                    }
                //In sustain phase, but not sustaining, do regular release
                case State.RELEASE:
                    vol += this.RateForward(this.releaseAdd);
                    if ((vol >= (511 << ((9) - 9)))) {
                        this.volume = (511 << ((9) - 9));
                        this.SetState(State.OFF);
                        return (511 << ((9) - 9));
                    }
                    break;
            }
            this.volume = vol;
            return vol | 0;
        }
        RateForward(add /* UInt32 */) {
            this.rateIndex += add | 0;
            let ret = this.rateIndex >>> 24;
            this.rateIndex = this.rateIndex & ((1 << 24) - 1);
            return ret;
        }
        ForwardWave() {
            this.waveIndex = (this.waveIndex + this.waveCurrent) >>> 0;
            return (this.waveIndex >>> (32 - 10));
        }
        ForwardVolume() {
            return this.currentLevel + this.TemplateVolume();
        }
        GetSample(modulation /** Int32 */) {
            //this.printDebug();
            let vol = this.ForwardVolume();
            if (((vol) >= ((12 * 256) >> (3 - ((9) - 9))))) {
                //Simply forward the wave
                this.waveIndex = (this.waveIndex + this.waveCurrent) >>> 0;
                return 0;
            }
            else {
                let index = this.ForwardWave();
                index += modulation;
                return this.GetWave(index, vol);
            }
        }
        GetWave(index /** Uint32 */, vol /** Uint32 */) {
            return ((DBOPL.GlobalMembers.WaveTable[this.waveBase + (index & this.waveMask)] * DBOPL.GlobalMembers.MulTable[vol >>> ((9) - 9)]) >> 16);
        }
    }
    DBOPL.Operator = Operator;
})(DBOPL || (DBOPL = {}));
/*
 *  Copyright (C) 2002-2015  The DOSBox Team
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 */
/*
* 2019 - Typescript Version: Thomas Zeugner
*/
/*
    DOSBox implementation of a combined Yamaha YMF262 and Yamaha YM3812 emulator.
    Enabling the opl3 bit will switch the emulator to stereo opl3 output instead of regular mono opl2
    Except for the table generation it's all integer math
    Can choose different types of generators, using muls and bigger tables, try different ones for slower platforms
    The generation was based on the MAME implementation but tried to have it use less memory and be faster in general
    MAME uses much bigger envelope tables and this will be the biggest cause of it sounding different at times

    //TODO Don't delay first operator 1 sample in opl3 mode
    //TODO Maybe not use class method pointers but a regular function pointers with operator as first parameter
    //TODO Fix panning for the Percussion channels, would any opl3 player use it and actually really change it though?
    //TODO Check if having the same accuracy in all frequency multipliers sounds better or not

    //DUNNO Keyon in 4op, switch to 2op without keyoff.
*/
/* $Id: dbopl.cpp,v 1.10 2009-06-10 19:54:51 harekiet Exp $ */
var DBOPL;
(function (DBOPL) {
    var SynthMode;
    (function (SynthMode) {
        SynthMode[SynthMode["sm2AM"] = 0] = "sm2AM";
        SynthMode[SynthMode["sm2FM"] = 1] = "sm2FM";
        SynthMode[SynthMode["sm3AM"] = 2] = "sm3AM";
        SynthMode[SynthMode["sm3FM"] = 3] = "sm3FM";
        SynthMode[SynthMode["sm4Start"] = 4] = "sm4Start";
        SynthMode[SynthMode["sm3FMFM"] = 5] = "sm3FMFM";
        SynthMode[SynthMode["sm3AMFM"] = 6] = "sm3AMFM";
        SynthMode[SynthMode["sm3FMAM"] = 7] = "sm3FMAM";
        SynthMode[SynthMode["sm3AMAM"] = 8] = "sm3AMAM";
        SynthMode[SynthMode["sm6Start"] = 9] = "sm6Start";
        SynthMode[SynthMode["sm2Percussion"] = 10] = "sm2Percussion";
        SynthMode[SynthMode["sm3Percussion"] = 11] = "sm3Percussion";
    })(SynthMode = DBOPL.SynthMode || (DBOPL.SynthMode = {}));
    // Shifts for the values contained in chandata variable
    var Shifts;
    (function (Shifts) {
        Shifts[Shifts["SHIFT_KSLBASE"] = 16] = "SHIFT_KSLBASE";
        Shifts[Shifts["SHIFT_KEYCODE"] = 24] = "SHIFT_KEYCODE";
    })(Shifts = DBOPL.Shifts || (DBOPL.Shifts = {}));
    ;
    // Max buffer size.  Since only 512 samples can be generated at a time, setting
    // this to 512 * 2 channels means it'll be the largest it'll ever need to be.
    const BUFFER_SIZE_SAMPLES = 1024;
    class OPL {
        constructor(freq, channels) {
            this.dbopl = new DBOPL.Handler();
            this.buffer = new Int16Array(BUFFER_SIZE_SAMPLES * channels);
            this.mixer = new DBOPL.MixerChannel(this.buffer, channels);
            this.dbopl.Init(freq);
        }
        write(reg, val) {
            this.dbopl.WriteReg(reg, val);
        }
        generate(lenSamples) {
            if (lenSamples > 512) {
                throw new Error('OPL.generate() cannot generate more than 512 samples per call');
            }
            if (lenSamples < 2) {
                throw new Error('OPL.generate() cannot generate fewer than 2 samples per call');
            }
            this.dbopl.Generate(this.mixer, lenSamples);
            return this.buffer;
        }
    }
    DBOPL.OPL = OPL;
})(DBOPL || (DBOPL = {}));
var Lemmings;
(function (Lemmings) {
    /** read the config.json file */
    class ConfigReader {
        constructor(configFile) {
            this.log = new Lemmings.LogHandler("ConfigReader");
            this.configs = new Promise((resolve, reject) => {
                configFile.then((jsonString) => {
                    let configJson = this.parseConfig(jsonString);
                    resolve(configJson);
                });
            });
        }
        /** return the game config for a given GameType */
        getConfig(gameType) {
            return new Promise((resolve, reject) => {
                this.configs.then((configs) => {
                    let config = configs.find((type) => type.gametype == gameType);
                    if (config == null) {
                        this.log.log("config for GameTypes:" + Lemmings.GameTypes.toString(gameType) + " not found!");
                        reject();
                        return;
                    }
                    resolve(config);
                });
            });
        }
        /** pars the config file */
        parseConfig(jsonData) {
            let gameConfigs = [];
            try {
                var config = JSON.parse(jsonData);
            }
            catch (e) {
                this.log.log("Unable to parse config", e);
                return gameConfigs;
            }
            /// for all game types
            for (let c = 0; c < config.length; c++) {
                let newConfig = new Lemmings.GameConfig();
                let configData = config[c];
                newConfig.name = configData["name"];
                newConfig.path = configData["path"];
                newConfig.gametype = Lemmings.GameTypes.fromString(configData["gametype"]);
                /// read level config
                if (configData["level.useoddtable"] != null) {
                    newConfig.level.useOddTable = (!!configData["level.useoddtable"]);
                }
                newConfig.level.order = configData["level.order"];
                newConfig.level.filePrefix = configData["level.filePrefix"];
                newConfig.level.groups = configData["level.groups"];
                /// read audio config
                newConfig.audioConfig.version = configData["audio.version"];
                newConfig.audioConfig.adlibChannelConfigPosition = configData["audio.adlibChannelConfigPosition"];
                newConfig.audioConfig.dataOffset = configData["audio.dataOffset"];
                newConfig.audioConfig.frequenciesOffset = configData["audio.frequenciesOffset"];
                newConfig.audioConfig.octavesOffset = configData["audio.octavesOffset"];
                newConfig.audioConfig.frequenciesCountOffset = configData["audio.frequenciesCountOffset"];
                newConfig.audioConfig.instructionsOffset = configData["audio.instructionsOffset"];
                newConfig.audioConfig.soundIndexTablePosition = configData["audio.soundIndexTablePosition"];
                newConfig.audioConfig.soundDataOffset = configData["audio.soundDataOffset"];
                newConfig.audioConfig.numberOfTracks = configData["audio.numberOfTracks"];
                gameConfigs.push(newConfig);
            }
            return gameConfigs;
        }
    }
    Lemmings.ConfigReader = ConfigReader;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class EventHandler {
        constructor() {
            this.handlers = [];
        }
        on(handler) {
            this.handlers.push(handler);
        }
        off(handler) {
            this.handlers = this.handlers.filter(h => h !== handler);
        }
        /// clear all callbacks
        dispose() {
            this.handlers = [];
        }
        /// raise all 
        trigger(arg) {
            this.handlers.slice(0).forEach(h => h(arg));
        }
    }
    Lemmings.EventHandler = EventHandler;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** handel error logging */
    class LogHandler {
        constructor(moduleName) {
            this._moduleName = moduleName;
        }
        /** log an error */
        log(msg, exeption) {
            console.log(this._moduleName + "\t" + msg);
            if (exeption) {
                console.log(this._moduleName + "\t" + exeption.message);
            }
        }
        /** write a debug message. If [msg] is not a String it is displayed: as {prop:value} */
        debug(msg) {
            if (typeof msg === 'string') {
                console.log(this._moduleName + "\t" + msg);
            }
            else {
                console.dir(msg);
            }
        }
    }
    Lemmings.LogHandler = LogHandler;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class Position2D {
        constructor(x = 0, y = 0) {
            /** X position in the container */
            this.x = 0;
            /** Y position in the container */
            this.y = 0;
            this.x = x;
            this.y = y;
        }
    }
    Lemmings.Position2D = Position2D;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class Rectangle {
        constructor(x1 = 0, y1 = 0, x2 = 0, y2 = 0) {
            /** X position in the container */
            this.x1 = 0;
            /** Y position in the container */
            this.y1 = 0;
            /** X position in the container */
            this.x2 = 0;
            /** Y position in the container */
            this.y2 = 0;
            this.x1 = x1;
            this.y1 = y1;
            this.x2 = x2;
            this.y2 = y2;
        }
    }
    Lemmings.Rectangle = Rectangle;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class GameView {
        constructor() {
            this.log = new Lemmings.LogHandler("GameView");
            this.levelIndex = 0;
            this.levelGroupIndex = 0;
            this.musicIndex = 0;
            this.soundIndex = 0;
            this.gameResources = null;
            this.musicPlayer = null;
            this.soundPlayer = null;
            this.game = null;
            this.gameFactory = new Lemmings.GameFactory("./");
            this.stage = null;
            this.elementSoundNumber = null;
            this.elementTrackNumber = null;
            this.elementLevelNumber = null;
            this.elementSelectedGame = null;
            this.elementSelectLevelGroup = null;
            this.elementLevelName = null;
            this.elementGameState = null;
            this.gameSpeedFactor = 1;
            this.applyQuery();
            this.log.log("selected level: " + Lemmings.GameTypes.toString(this.gameType) + " : " + this.levelIndex + " / " + this.levelGroupIndex);
        }
        set gameCanvas(el) {
            this.stage = new Lemmings.Stage(el);
        }
        /** start or continue the game */
        start(replayString) {
            if (!this.gameFactory)
                return;
            /// is the game already running
            if (this.game != null) {
                this.continue();
                return;
            }
            /// create new game
            return this.gameFactory.getGame(this.gameType)
                .then(game => game.loadLevel(this.levelGroupIndex, this.levelIndex))
                .then(game => {
                if (replayString != null) {
                    game.getCommandManager().loadReplay(replayString);
                }
                game.setGameDispaly(this.stage.getGameDisplay());
                game.setGuiDisplay(this.stage.getGuiDisplay());
                game.getGameTimer().speedFactor = this.gameSpeedFactor;
                game.start();
                this.changeHtmlText(this.elementGameState, Lemmings.GameStateTypes.toString(Lemmings.GameStateTypes.RUNNING));
                game.onGameEnd.on((state) => this.onGameEnd(state));
                this.game = game;
                if (this.cheat) {
                    this.game.cheat();
                }
            });
        }
        onGameEnd(gameResult) {
            this.changeHtmlText(this.elementGameState, Lemmings.GameStateTypes.toString(gameResult.state));
            this.stage.startFadeOut();
            console.dir(gameResult);
            window.setTimeout(() => {
                if (gameResult.state == Lemmings.GameStateTypes.SUCCEEDED) {
                    /// move to next level
                    this.moveToLevel(1);
                }
                else {
                    /// redo this level
                    this.moveToLevel(0);
                }
            }, 2500);
        }
        /** load and run a replay */
        loadReplay(replayString) {
            this.start(replayString);
        }
        /** pause the game */
        cheat() {
            if (this.game == null) {
                return;
            }
            this.game.cheat();
        }
        /** pause the game */
        suspend() {
            if (this.game == null) {
                return;
            }
            this.game.getGameTimer().suspend();
        }
        /** continue the game after pause/suspend */
        continue() {
            if (this.game == null) {
                return;
            }
            this.game.getGameTimer().continue();
        }
        nextFrame() {
            if (this.game == null) {
                return;
            }
            this.game.getGameTimer().tick();
        }
        selectSpeedFactor(newSpeed) {
            if (this.game == null) {
                return;
            }
            this.gameSpeedFactor = newSpeed;
            this.game.getGameTimer().speedFactor = newSpeed;
        }
        playMusic(moveInterval) {
            this.stopMusic();
            if (!this.gameResources)
                return;
            if (moveInterval == null)
                moveInterval = 0;
            this.musicIndex += moveInterval;
            this.musicIndex = (this.musicIndex < 0) ? 0 : this.musicIndex;
            this.changeHtmlText(this.elementTrackNumber, this.musicIndex.toString());
            this.gameResources.getMusicPlayer(this.musicIndex)
                .then((player) => {
                this.musicPlayer = player;
                this.musicPlayer.play();
            });
        }
        stopMusic() {
            if (this.musicPlayer) {
                this.musicPlayer.stop();
                this.musicPlayer = null;
            }
        }
        stopSound() {
            if (this.soundPlayer) {
                this.soundPlayer.stop();
                this.soundPlayer = null;
            }
        }
        playSound(moveInterval) {
            this.stopSound();
            if (moveInterval == null)
                moveInterval = 0;
            this.soundIndex += moveInterval;
            this.soundIndex = (this.soundIndex < 0) ? 0 : this.soundIndex;
            this.changeHtmlText(this.elementSoundNumber, this.soundIndex.toString());
            this.gameResources.getSoundPlayer(this.soundIndex)
                .then((player) => {
                this.soundPlayer = player;
                this.soundPlayer.play();
            });
        }
        enableDebug() {
            if (this.game == null) {
                return;
            }
            this.game.setDebugMode(true);
        }
        /** add/subtract one to the current levelIndex */
        moveToLevel(moveInterval) {
            if (moveInterval == null)
                moveInterval = 0;
            if (this.levelIndex + moveInterval < 0 && this.levelGroupIndex == 0) {
                return;
            }
            if (this.inMoveToLevel) {
                return;
            }
            this.inMoveToLevel = true;
            this.levelIndex = (this.levelIndex + moveInterval) | 0;
            /// check if the levelIndex is out of bounds
            this.gameFactory.getConfig(this.gameType).then((config) => {
                /// jump to next level group?
                if (this.levelIndex >= config.level.getGroupLength(this.levelGroupIndex)) {
                    this.levelGroupIndex++;
                    this.levelIndex = 0;
                } else if (this.levelGroupIndex > 0 && this.levelIndex < 0) {
                    this.levelGroupIndex--;
                    this.levelIndex = config.level.getGroupLength(this.levelGroupIndex) - 1;
                }
                if (this.levelGroupIndex >= config.level.order.length) {
                    this.gameType++;
                    this.levelGroupIndex = 0;
                    this.levelIndex = 0;
                }
                if (!Lemmings.GameTypes[this.gameType]) {
                    this.gameType = 1;
                    this.levelGroupIndex = 0;
                    this.levelIndex = 0;
                }
                /// jump to previous level group?
                if ((this.levelIndex < 0) && (this.levelGroupIndex > 0)) {
                    this.levelGroupIndex--;
                    this.levelIndex = config.level.getGroupLength(this.levelGroupIndex) - 1;
                }
                /// update and load level
                this.changeHtmlText(this.elementLevelNumber, (this.levelIndex + 1).toString());
                this.loadLevel().then(() => {
                    this.inMoveToLevel = false;
                });
            });
        }
        /** return the url hash for the pressent game/group/level-index */
        applyQuery() {
            this.gameType = 1;
            let query = new URLSearchParams(window.location.search);
            if (query.get("version") || query.get("v")) {
                let queryVersion = parseInt(query.get("version") || query.get("v"), 10);
                if (!isNaN(queryVersion) && queryVersion >= 1 && queryVersion <= 2) {
                    this.gameType = queryVersion;
                }
            }
            this.levelGroupIndex = 0;
            if (query.get("difficulty") || query.get("d")) {
                let queryDifficulty = parseInt(query.get("difficulty") || query.get("d"), 10);
                if (!isNaN(queryDifficulty) && queryDifficulty >= 1 && queryDifficulty <= 5) {
                    this.levelGroupIndex = queryDifficulty - 1;
                }
            }
            this.levelIndex = 0;
            if (query.get("level") || query.get("l")) {
                let queryLevel = parseInt(query.get("level") || query.get("l"), 10);
                if (!isNaN(queryLevel) && queryLevel >= 1 && queryLevel <= 30) {
                    this.levelIndex = queryLevel - 1;
                }
            }
            this.gameSpeedFactor = 1;
            if (query.get("speed") || query.get("s")) {
                let querySpeed = parseFloat(query.get("speed") || query.get("s"));
                if (!isNaN(querySpeed) && querySpeed > 0 && querySpeed <= 10) {
                    this.gameSpeedFactor = querySpeed;
                }
            }
            this.cheat = false;
            if (query.get("cheat") || query.get("c")) {
                this.cheat = (query.get("cheat") || query.get("c")) === "true";
            }
            this.shortcut = false;
            if (query.get("shortcut") || query.get("_")) {
                this.shortcut = (query.get("shortcut") || query.get("_")) === "true";
            }
        }
        updateQuery() {
            if (this.shortcut) {
                this.setHistoryState({
                    v: this.gameType,
                    d: this.levelGroupIndex + 1,
                    l: this.levelIndex + 1,
                    s: this.gameSpeedFactor,
                    c: !!this.cheat,
                    _: true
                });
            } else {
                this.setHistoryState({
                    version: this.gameType,
                    difficulty: this.levelGroupIndex + 1,
                    level: this.levelIndex + 1,
                    speed: this.gameSpeedFactor,
                    cheat: !!this.cheat
                });
            }
        }
        setHistoryState(state) {
            history.replaceState(
              null,
              null,
              "?" +
              Object.keys(state)
                .map((key) => key + "=" + state[key])
                .join("&")
            );
        }
        /** convert a string to a number */
        strToNum(str) {
            return Number(str) | 0;
        }
        /** change the the text of a html element */
        changeHtmlText(htmlElement, value) {
            if (htmlElement == null) {
                return;
            }
            htmlElement.innerText = value;
        }
        /** remove items of a <select> */
        clearHtmlList(htmlList) {
            while (htmlList.options.length) {
                htmlList.remove(0);
            }
        }
        /** add array elements to a <select> */
        arrayToSelect(htmlList, list) {
            if (htmlList == null) {
                return;
            }
            this.clearHtmlList(htmlList);
            for (var i = 0; i < list.length; i++) {
                var opt = list[i];
                var el = document.createElement("option");
                el.textContent = opt;
                el.value = i.toString();
                htmlList.appendChild(el);
            }
        }
        /** switch the selected level group */
        selectLevelGroup(newLevelGroupIndex) {
            this.levelGroupIndex = newLevelGroupIndex;
            this.loadLevel();
        }
        /** select a game type */
        setup() {
            this.applyQuery();
            this.gameFactory.getGameResources(this.gameType)
                .then((newGameResources) => {
                this.gameResources = newGameResources;
                this.arrayToSelect(this.elementSelectLevelGroup, this.gameResources.getLevelGroups());
                this.loadLevel();
            });
        }
        /** load a level and render it to the display */
        loadLevel() {
            if (this.gameResources == null)
                return;
            if (this.game != null) {
                this.game.stop();
                this.game = null;
            }
            this.changeHtmlText(this.elementGameState, Lemmings.GameStateTypes.toString(Lemmings.GameStateTypes.UNKNOWN));
            return this.gameResources.getLevel(this.levelGroupIndex, this.levelIndex)
                .then((level) => {
                if (level == null)
                    return;
                this.changeHtmlText(this.elementLevelName, level.name);
                if (this.stage != null) {
                    let gameDisplay = this.stage.getGameDisplay();
                    gameDisplay.clear();
                    this.stage.resetFade();
                    level.render(gameDisplay);
                    gameDisplay.setScreenPosition(level.screenPositionX, 0);
                    gameDisplay.redraw();
                }
                this.updateQuery();
                console.dir(level);
                return this.start();
            });
        }
    }
    Lemmings.GameView = GameView;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** handel the display of the game images */
    class DisplayImage {
        constructor(stage) {
            this.stage = stage;
            this.onMouseUp = new Lemmings.EventHandler();
            this.onMouseDown = new Lemmings.EventHandler();
            this.onMouseMove = new Lemmings.EventHandler();
            this.onDoubleClick = new Lemmings.EventHandler();
            this.onMouseDown.on((e) => {
                //this.setDebugPixel(e.x, e.y);
            });
        }
        getWidth() {
            if (this.imgData == null)
                return 0;
            return this.imgData.width;
        }
        getHeight() {
            if (this.imgData == null)
                return 0;
            return this.imgData.height;
        }
        initSize(width, height) {
            /// create image data
            if ((this.imgData == null) || (this.imgData.width != width) || (this.imgData.height != height)) {
                this.imgData = this.stage.createImage(this, width, height);
                this.clear();
            }
        }
        clear() {
            if (this.imgData == null)
                return;
            let img = new Uint32Array(this.imgData.data);
            for (let i = 0; i < img.length; i++) {
                img[i] = 0xFF00FF00;
            }
        }
        /** render the level-background to an image */
        setBackground(groundImage, groundMask = null) {
            /// set pixels
            this.imgData.data.set(groundImage);
            this.groundMask = groundMask;
        }
        uint8ClampedColor(colorValue) {
            return colorValue & 0xFF;
        }
        drawRectangle(rect, red, green, blue) {
            this.drawHorizontalLine(rect.x1, rect.y1, rect.x2, red, green, blue);
            this.drawHorizontalLine(rect.x1, rect.y2, rect.x2, red, green, blue);
            this.drawVerticalLine(rect.x1, rect.y1, rect.y2, red, green, blue);
            this.drawVerticalLine(rect.x2, rect.y1, rect.y2, red, green, blue);
        }
        /** draw a rect to the display */
        drawRect(x, y, width, height, red, green, blue) {
            let x2 = x + width;
            let y2 = y + height;
            this.drawHorizontalLine(x, y, x2, red, green, blue);
            this.drawHorizontalLine(x, y2, x2, red, green, blue);
            this.drawVerticalLine(x, y, y2, red, green, blue);
            this.drawVerticalLine(x2, y, y2, red, green, blue);
        }
        drawVerticalLine(x1, y1, y2, red, green, blue) {
            red = this.uint8ClampedColor(red);
            green = this.uint8ClampedColor(green);
            blue = this.uint8ClampedColor(blue);
            let destW = this.imgData.width;
            let destH = this.imgData.height;
            let destData = this.imgData.data;
            x1 = (x1 >= destW) ? (destW - 1) : (x1 < 0) ? 0 : x1;
            y1 = (y1 >= destH) ? (destH - 1) : (y1 < 0) ? 0 : y1;
            y2 = (y2 >= destH) ? (destH - 1) : (y2 < 0) ? 0 : y2;
            for (let y = y1; y <= y2; y += 1) {
                let destIndex = ((destW * y) + x1) * 4;
                destData[destIndex] = red;
                destData[destIndex + 1] = green;
                destData[destIndex + 2] = blue;
                destData[destIndex + 3] = 255;
            }
        }
        drawHorizontalLine(x1, y1, x2, red, green, blue) {
            red = this.uint8ClampedColor(red);
            green = this.uint8ClampedColor(green);
            blue = this.uint8ClampedColor(blue);
            let destW = this.imgData.width;
            let destH = this.imgData.height;
            let destData = this.imgData.data;
            x1 = (x1 >= destW) ? (destW - 1) : (x1 < 0) ? 0 : x1;
            y1 = (y1 >= destH) ? (destH - 1) : (y1 < 0) ? 0 : y1;
            x2 = (x2 >= destW) ? (destW - 1) : (x2 < 0) ? 0 : x2;
            for (let x = x1; x <= x2; x += 1) {
                let destIndex = ((destW * y1) + x) * 4;
                destData[destIndex] = red;
                destData[destIndex + 1] = green;
                destData[destIndex + 2] = blue;
                destData[destIndex + 3] = 255;
            }
        }
        /** copy a maks frame to the display */
        drawMask(mask, posX, posY) {
            let srcW = mask.width;
            let srcH = mask.height;
            let srcMask = mask.getMask();
            let destW = this.imgData.width;
            let destH = this.imgData.height;
            let destData = new Uint32Array(this.imgData.data.buffer);
            let destX = posX + mask.offsetX;
            let destY = posY + mask.offsetY;
            for (let y = 0; y < srcH; y++) {
                let outY = y + destY;
                if ((outY < 0) || (outY >= destH))
                    continue;
                for (let x = 0; x < srcW; x++) {
                    let srcIndex = ((srcW * y) + x);
                    /// ignore transparent pixels
                    if (srcMask[srcIndex] == 0)
                        continue;
                    let outX = x + destX;
                    if ((outX < 0) || (outX >= destW))
                        continue;
                    let destIndex = ((destW * outY) + outX);
                    destData[destIndex] = 0xFFFFFFFF;
                }
            }
        }
        /** copy a frame to the display - transparent color is changed to (r,g,b) */
        drawFrameCovered(frame, posX, posY, red, green, blue) {
            let srcW = frame.width;
            let srcH = frame.height;
            let srcBuffer = frame.getBuffer();
            let srcMask = frame.getMask();
            let nullCollor = 0xFF << 24 | blue << 16 | green << 8 | red;
            let destW = this.imgData.width;
            let destH = this.imgData.height;
            let destData = new Uint32Array(this.imgData.data.buffer);
            let destX = posX + frame.offsetX;
            let destY = posY + frame.offsetY;
            red = this.uint8ClampedColor(red);
            green = this.uint8ClampedColor(green);
            blue = this.uint8ClampedColor(blue);
            for (let y = 0; y < srcH; y++) {
                let outY = y + destY;
                if ((outY < 0) || (outY >= destH))
                    continue;
                for (let x = 0; x < srcW; x++) {
                    let srcIndex = ((srcW * y) + x);
                    let outX = x + destX;
                    if ((outX < 0) || (outX >= destW))
                        continue;
                    let destIndex = ((destW * outY) + outX);
                    if (srcMask[srcIndex] == 0) {
                        /// transparent pixle
                        destData[destIndex] = nullCollor;
                    }
                    else {
                        destData[destIndex] = srcBuffer[srcIndex];
                    }
                }
            }
        }
        /** copy a frame to the display */
        drawFrame(frame, posX, posY) {
            let srcW = frame.width;
            let srcH = frame.height;
            let srcBuffer = frame.getBuffer();
            let srcMask = frame.getMask();
            let destW = this.imgData.width;
            let destH = this.imgData.height;
            let destData = new Uint32Array(this.imgData.data.buffer);
            let destX = posX + frame.offsetX;
            let destY = posY + frame.offsetY;
            for (let y = 0; y < srcH; y++) {
                let outY = y + destY;
                if ((outY < 0) || (outY >= destH))
                    continue;
                for (let x = 0; x < srcW; x++) {
                    let srcIndex = ((srcW * y) + x);
                    /// ignore transparent pixels
                    if (srcMask[srcIndex] == 0)
                        continue;
                    let outX = x + destX;
                    if ((outX < 0) || (outX >= destW))
                        continue;
                    let destIndex = ((destW * outY) + outX);
                    destData[destIndex] = srcBuffer[srcIndex];
                }
            }
        }
        /** copy a frame to the display */
        drawFrameFlags(frame, posX, posY, destConfig) {
            let srcW = frame.width;
            let srcH = frame.height;
            let srcBuffer = frame.getBuffer();
            let srcMask = frame.getMask();
            let destW = this.imgData.width;
            let destH = this.imgData.height;
            let destData = new Uint32Array(this.imgData.data.buffer);
            let destX = posX + frame.offsetX;
            let destY = posY + frame.offsetY;
            var upsideDown = destConfig.isUpsideDown;
            var noOverwrite = destConfig.noOverwrite;
            var onlyOverwrite = destConfig.onlyOverwrite;
            var mask = this.groundMask;
            for (let srcY = 0; srcY < srcH; srcY++) {
                let outY = srcY + destY;
                if ((outY < 0) || (outY >= destH))
                    continue;
                for (let srcX = 0; srcX < srcW; srcX++) {
                    let sourceY = upsideDown ? (srcH - srcY - 1) : srcY;
                    let srcIndex = ((srcW * sourceY) + srcX);
                    /// ignore transparent pixels
                    if (srcMask[srcIndex] == 0)
                        continue;
                    let outX = srcX + destX;
                    if ((outX < 0) || (outX >= destW))
                        continue;
                    /// check flags
                    if (noOverwrite) {
                        if (mask.hasGroundAt(outX, outY))
                            continue;
                    }
                    if (onlyOverwrite) {
                        if (!mask.hasGroundAt(outX, outY))
                            continue;
                    }
                    /// draw
                    let destIndex = ((destW * outY) + outX);
                    destData[destIndex] = srcBuffer[srcIndex];
                }
            }
        }
        setDebugPixel(x, y) {
            let pointIndex = (this.imgData.width * (y) + x) * 4;
            this.imgData.data[pointIndex] = 255;
            this.imgData.data[pointIndex + 1] = 0;
            this.imgData.data[pointIndex + 2] = 0;
        }
        setPixel(x, y, r, g, b) {
            let pointIndex = (this.imgData.width * (y) + x) * 4;
            this.imgData.data[pointIndex] = r;
            this.imgData.data[pointIndex + 1] = g;
            this.imgData.data[pointIndex + 2] = b;
        }
        setScreenPosition(x, y) {
            this.stage.setGameViewPointPosition(x, y);
        }
        getImageData() {
            return this.imgData;
        }
        redraw() {
            this.stage.redraw();
        }
    }
    Lemmings.DisplayImage = DisplayImage;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class GameDisplay {
        constructor(game, level, lemmingManager, objectManager, triggerManager) {
            this.game = game;
            this.level = level;
            this.lemmingManager = lemmingManager;
            this.objectManager = objectManager;
            this.triggerManager = triggerManager;
            this.dispaly = null;
        }
        setGuiDisplay(dispaly) {
            this.dispaly = dispaly;
            this.dispaly.onMouseDown.on((e) => {
                //console.log(e.x +" "+ e.y);
                let lem = this.lemmingManager.getLemmingAt(e.x, e.y);
                if (!lem)
                    return;
                this.game.queueCmmand(new Lemmings.CommandLemmingsAction(lem.id));
            });
        }
        render() {
            if (this.dispaly == null)
                return;
            this.level.render(this.dispaly);
            this.objectManager.render(this.dispaly);
            this.lemmingManager.render(this.dispaly);
        }
        renderDebug() {
            if (this.dispaly == null)
                return;
            this.lemmingManager.renderDebug(this.dispaly);
            this.triggerManager.renderDebug(this.dispaly);
        }
    }
    Lemmings.GameDisplay = GameDisplay;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** handles the in-game-gui. e.g. the panel on the bottom of the game */
    class GameGui {
        constructor(game, skillPanelSprites, skills, gameTimer, gameVictoryCondition) {
            this.game = game;
            this.skillPanelSprites = skillPanelSprites;
            this.skills = skills;
            this.gameTimer = gameTimer;
            this.gameVictoryCondition = gameVictoryCondition;
            this.gameTimeChanged = true;
            this.skillsCountChangd = true;
            this.skillSelectionChanged = true;
            this.backgroundChanged = true;
            this.dispaly = null;
            this.deltaReleaseRate = 0;
            gameTimer.onGameTick.on(() => {
                this.gameTimeChanged = true;
                this.doReleaseRateChanges();
            });
            skills.onCountChanged.on(() => {
                this.skillsCountChangd = true;
                this.backgroundChanged = true;
            });
            skills.onSelectionChanged.on(() => {
                this.skillSelectionChanged = true;
                this.backgroundChanged = true;
            });
        }
        doReleaseRateChanges() {
            if (this.deltaReleaseRate == 0) {
                return;
            }
            if (this.deltaReleaseRate > 0) {
                this.game.queueCmmand(new Lemmings.CommandReleaseRateIncrease(this.deltaReleaseRate));
            }
            else {
                this.game.queueCmmand(new Lemmings.CommandReleaseRateDecrease(-this.deltaReleaseRate));
            }
        }
        /// handel click on the skills panel
        handleSkillMouseDown(x) {
            let panelIndex = Math.trunc(x / 16);
            if (panelIndex != 11) {
                this.game.nukePrepared = false;
            }
            if (panelIndex == 0) {
                this.deltaReleaseRate = -3;
                this.doReleaseRateChanges();
                return;
            }
            if (panelIndex == 1) {
                this.deltaReleaseRate = 3;
                this.doReleaseRateChanges();
                return;
            }
            if (panelIndex == 10) {
                this.gameTimer.toggle();
                return;
            }
            if (panelIndex == 11) {
                if (this.game.nukePrepared) {
                    this.game.queueCmmand(new Lemmings.CommandNuke());
                } else {
                    this.game.nukePrepared = true;
                }
                return;
            }
            if (panelIndex == 12) {
                if (this.gameTimer.speedFactor < 10) {
                    this.gameTimer.speedFactor += 2;
                }
                return;
            }
            let newSkill = this.getSkillByPanelIndex(panelIndex);
            if (newSkill == Lemmings.SkillTypes.UNKNOWN)
                return;
            this.game.queueCmmand(new Lemmings.CommandSelectSkill(newSkill));
            this.skillSelectionChanged = true;
        }
        handleSkillDoubleClick(x) {
            let panelIndex = Math.trunc(x / 16);
            /// trigger the nuke for all lemmings
            if (panelIndex == 11) {
                this.game.queueCmmand(new Lemmings.CommandNuke());
            }
        }
        /** init the display */
        setGuiDisplay(dispaly) {
            this.dispaly = dispaly;
            /// handle user input in gui
            this.dispaly.onMouseDown.on((e) => {
                this.deltaReleaseRate = 0;
                if (e.y > 15) {
                    this.handleSkillMouseDown(e.x);
                }
            });
            this.dispaly.onMouseUp.on((e) => {
                /// clear release rate change
                this.deltaReleaseRate = 0;
            });
            this.dispaly.onDoubleClick.on((e) => {
                /// clear release rate change
                this.deltaReleaseRate = 0;
                if (e.y > 15) {
                    this.handleSkillDoubleClick(e.x);
                }
            });
            this.gameTimeChanged = true;
            this.skillsCountChangd = true;
            this.skillSelectionChanged = true;
            this.backgroundChanged = true;
        }
        /** render the gui to the screen display */
        render() {
            if (this.dispaly == null)
                return;
            let dispaly = this.dispaly;
            /// background
            if (this.backgroundChanged) {
                this.backgroundChanged = false;
                let panelImage = this.skillPanelSprites.getPanelSprite();
                dispaly.initSize(panelImage.width, panelImage.height);
                dispaly.setBackground(panelImage.getData());
                /// redraw everything
                this.gameTimeChanged = true;
                this.skillsCountChangd = true;
                this.skillSelectionChanged = true;
            }
            /////////
            /// green text
            this.drawGreenString(dispaly, "Out " + this.gameVictoryCondition.getOutCount() + "  ", 112, 0);
            this.drawGreenString(dispaly, "In" + this.stringPad(this.gameVictoryCondition.getSurvivorPercentage() + "", 3) + "%", 186, 0);
            if (this.gameTimeChanged) {
                this.gameTimeChanged = false;
                this.renderGameTime(dispaly, 248, 0);
            }
            /////////
            /// white skill numbers
            this.drawPanelNumber(dispaly, this.gameVictoryCondition.getMinReleaseRate(), 0);
            this.drawPanelNumber(dispaly, this.gameVictoryCondition.getCurrentReleaseRate(), 1);
            if (this.skillsCountChangd) {
                this.skillsCountChangd = false;
                for (let i = 1 /* jump over unknown */; i < Lemmings.SkillTypes.length(); i++) {
                    let count = this.skills.getSkill(i);
                    this.drawPanelNumber(dispaly, count, this.getPanelIndexBySkill(i));
                }
            }
            ////////
            /// selected skill
            if (this.skillSelectionChanged) {
                this.skillSelectionChanged = false;
                this.drawSelection(dispaly, this.getPanelIndexBySkill(this.skills.getSelectedSkill()));
            }
        }
        /** left pad a string with spaces */
        stringPad(str, length) {
            if (str.length >= length)
                return str;
            return " ".repeat(length - str.length) + str;
        }
        /** return the skillType for an index */
        getSkillByPanelIndex(panelIndex) {
            switch (Math.trunc(panelIndex)) {
                case 2: return Lemmings.SkillTypes.CLIMBER;
                case 3: return Lemmings.SkillTypes.FLOATER;
                case 4: return Lemmings.SkillTypes.BOMBER;
                case 5: return Lemmings.SkillTypes.BLOCKER;
                case 6: return Lemmings.SkillTypes.BUILDER;
                case 7: return Lemmings.SkillTypes.BASHER;
                case 8: return Lemmings.SkillTypes.MINER;
                case 9: return Lemmings.SkillTypes.DIGGER;
                default: return Lemmings.SkillTypes.UNKNOWN;
            }
        }
        /** return the index for a skillType */
        getPanelIndexBySkill(skill) {
            switch (skill) {
                case Lemmings.SkillTypes.CLIMBER: return 2;
                case Lemmings.SkillTypes.FLOATER: return 3;
                case Lemmings.SkillTypes.BOMBER: return 4;
                case Lemmings.SkillTypes.BLOCKER: return 5;
                case Lemmings.SkillTypes.BUILDER: return 6;
                case Lemmings.SkillTypes.BASHER: return 7;
                case Lemmings.SkillTypes.MINER: return 8;
                case Lemmings.SkillTypes.DIGGER: return 9;
                default: return -1;
            }
        }
        /** draw a white rectangle border to the panel */
        drawSelection(dispaly, panelIndex) {
            dispaly.drawRect(16 * panelIndex, 16, 16, 23, 255, 255, 255);
        }
        /** draw the game time to the panel */
        renderGameTime(dispaly, x, y) {
            let gameTime = this.gameTimer.getGameLeftTimeString();
            this.drawGreenString(dispaly, "Time " + gameTime + "-00", x, y);
        }
        /** draw a white number to the skill-panel */
        drawPanelNumber(dispaly, number, panelIndex) {
            this.drawNumber(dispaly, number, 4 + 16 * panelIndex, 17);
        }
        /** draw a white number */
        drawNumber(dispaly, number, x, y) {
            if (number > 0) {
                let num1Img = this.skillPanelSprites.getNumberSpriteLeft(Math.floor(number / 10));
                let num2Img = this.skillPanelSprites.getNumberSpriteRight(number % 10);
                dispaly.drawFrameCovered(num1Img, x, y, 0, 0, 0);
                dispaly.drawFrame(num2Img, x, y);
            }
            else {
                let numImg = this.skillPanelSprites.getNumberSpriteEmpty();
                dispaly.drawFrame(numImg, x, y);
            }
            return x + 8;
        }
        /** draw a text with green letters */
        drawGreenString(dispaly, text, x, y) {
            for (let i = 0; i < text.length; i++) {
                let letterImg = this.skillPanelSprites.getLetterSprite(text[i]);
                if (letterImg != null) {
                    dispaly.drawFrameCovered(letterImg, x, y, 0, 0, 0);
                }
                x += 8;
            }
            return x;
        }
    }
    Lemmings.GameGui = GameGui;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class StageImageProperties {
        constructor() {
            /** X position to display this Image */
            this.x = 0;
            /** Y position to display this Image */
            this.y = 0;
            this.width = 0;
            this.height = 0;
            this.display = null;
            this.viewPoint = new Lemmings.ViewPoint(0, 0, 2);
        }
        createImage(width, height) {
            this.cav = document.createElement('canvas');
            this.cav.width = width;
            this.cav.height = height;
            this.ctx = this.cav.getContext("2d");
            return this.ctx.createImageData(width, height);
        }
    }
    Lemmings.StageImageProperties = StageImageProperties;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** handel the display / output of game, gui, ... */
    class Stage {
        constructor(canvasForOutput) {
            this.controller = null;
            this.fadeTimer = 0;
            this.fadeAlpha = 0;
            this.controller = new Lemmings.UserInputManager(canvasForOutput);
            this.handleOnMouseUp();
            this.handleOnMouseDown();
            this.handleOnMouseMove();
            this.handleOnDoubleClick();
            this.handelOnZoom();
            this.stageCav = canvasForOutput;
            this.gameImgProps = new Lemmings.StageImageProperties();
            this.guiImgProps = new Lemmings.StageImageProperties();
            this.guiImgProps.viewPoint = new Lemmings.ViewPoint(0, 0, 2);
            this.updateStageSize();
            this.clear();
        }
        calcPosition2D(stageImage, e) {
            let x = (stageImage.viewPoint.getSceneX(e.x - stageImage.x));
            let y = (stageImage.viewPoint.getSceneY(e.y - stageImage.y));
            return new Lemmings.Position2D(x, y);
        }
        handleOnDoubleClick() {
            this.controller.onDoubleClick.on((e) => {
                let stageImage = this.getStageImageAt(e.x, e.y);
                if ((stageImage == null) || (stageImage.display == null))
                    return;
                stageImage.display.onDoubleClick.trigger(this.calcPosition2D(stageImage, e));
            });
        }
        handleOnMouseDown() {
            this.controller.onMouseDown.on((e) => {
                let stageImage = this.getStageImageAt(e.x, e.y);
                if ((stageImage == null) || (stageImage.display == null))
                    return;
                stageImage.display.onMouseDown.trigger(this.calcPosition2D(stageImage, e));
            });
        }
        handleOnMouseUp() {
            this.controller.onMouseUp.on((e) => {
                let stageImage = this.getStageImageAt(e.x, e.y);
                if ((stageImage == null) || (stageImage.display == null))
                    return;
                let pos = this.calcPosition2D(stageImage, e);
                stageImage.display.onMouseUp.trigger(pos);
            });
        }
        handleOnMouseMove() {
            this.controller.onMouseMove.on((e) => {
                if (e.button) {
                    let stageImage = this.getStageImageAt(e.mouseDownX, e.mouseDownY);
                    if (stageImage == null)
                        return;
                    if (stageImage == this.gameImgProps) {
                        this.updateViewPoint(stageImage, e.deltaX, e.deltaY, 0);
                    }
                }
                else {
                    let stageImage = this.getStageImageAt(e.x, e.y);
                    if (stageImage == null)
                        return;
                    if (stageImage.display == null)
                        return;
                    let x = e.x - stageImage.x;
                    let y = e.y - stageImage.y;
                    stageImage.display.onMouseMove.trigger(new Lemmings.Position2D(stageImage.viewPoint.getSceneX(x), stageImage.viewPoint.getSceneY(y)));
                }
            });
        }
        handelOnZoom() {
            this.controller.onZoom.on((e) => {
                let stageImage = this.getStageImageAt(e.x, e.y);
                if (stageImage == null)
                    return;
                this.updateViewPoint(stageImage, 0, 0, e.deltaZoom);
            });
        }
        updateViewPoint(stageImage, deltaX, deltaY, deletaZoom) {
            stageImage.viewPoint.scale += deletaZoom * 0.5;
            stageImage.viewPoint.scale = this.limitValue(0.5, stageImage.viewPoint.scale, 10);
            stageImage.viewPoint.x += deltaX / stageImage.viewPoint.scale;
            stageImage.viewPoint.y += deltaY / stageImage.viewPoint.scale;
            stageImage.viewPoint.x = this.limitValue(0, stageImage.viewPoint.x, stageImage.display.getWidth() - stageImage.width / stageImage.viewPoint.scale);
            stageImage.viewPoint.y = this.limitValue(0, stageImage.viewPoint.y, stageImage.display.getHeight() - stageImage.height / stageImage.viewPoint.scale);
            /// redraw
            if (stageImage.display != null) {
                this.clear(stageImage);
                let gameImg = stageImage.display.getImageData();
                this.draw(stageImage, gameImg);
            }
            ;
        }
        limitValue(minLimit, value, maxLimit) {
            let useMax = Math.max(minLimit, maxLimit);
            return Math.min(Math.max(minLimit, value), useMax);
        }
        updateStageSize() {
            let ctx = this.stageCav.getContext("2d");
            let stageHeight = ctx.canvas.height;
            let stageWidth = ctx.canvas.width;
            this.gameImgProps.y = 0;
            this.gameImgProps.height = stageHeight - 100;
            this.gameImgProps.width = stageWidth;
            this.guiImgProps.y = stageHeight - 100;
            this.guiImgProps.height = 100;
            this.guiImgProps.width = stageWidth;
        }
        getStageImageAt(x, y) {
            if (this.isPositionInStageImage(this.gameImgProps, x, y))
                return this.gameImgProps;
            if (this.isPositionInStageImage(this.guiImgProps, x, y))
                return this.guiImgProps;
            return null;
        }
        isPositionInStageImage(stageImage, x, y) {
            return ((stageImage.x <= x) && ((stageImage.x + stageImage.width) >= x)
                && (stageImage.y <= y) && ((stageImage.y + stageImage.height) >= y));
        }
        getGameDisplay() {
            if (this.gameImgProps.display != null)
                return this.gameImgProps.display;
            this.gameImgProps.display = new Lemmings.DisplayImage(this);
            return this.gameImgProps.display;
        }
        getGuiDisplay() {
            if (this.guiImgProps.display != null)
                return this.guiImgProps.display;
            this.guiImgProps.display = new Lemmings.DisplayImage(this);
            return this.guiImgProps.display;
        }
        /** set the position of the view point for the game dispaly */
        setGameViewPointPosition(x, y) {
            this.gameImgProps.viewPoint.x = x;
            this.gameImgProps.viewPoint.y = y;
        }
        /** redraw everything */
        redraw() {
            if (this.gameImgProps.display != null) {
                let gameImg = this.gameImgProps.display.getImageData();
                this.draw(this.gameImgProps, gameImg);
            }
            ;
            if (this.guiImgProps.display != null) {
                let guiImg = this.guiImgProps.display.getImageData();
                this.draw(this.guiImgProps, guiImg);
            }
            ;
        }
        createImage(display, width, height) {
            if (display == this.gameImgProps.display) {
                return this.gameImgProps.createImage(width, height);
            }
            else {
                return this.guiImgProps.createImage(width, height);
            }
        }
        /** clear the stage/display/output */
        clear(stageImage) {
            var ctx = this.stageCav.getContext("2d");
            ctx.fillStyle = "#000000";
            if (stageImage == null) {
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }
            else {
                ctx.fillRect(stageImage.x, stageImage.y, stageImage.width, stageImage.height);
            }
        }
        resetFade() {
            this.fadeAlpha = 0;
            if (this.fadeTimer != 0) {
                clearInterval(this.fadeTimer);
                this.fadeTimer = 0;
            }
        }
        startFadeOut() {
            this.resetFade();
            this.fadeTimer = setInterval(() => {
                this.fadeAlpha = Math.min(this.fadeAlpha + 0.02, 1);
                if (this.fadeAlpha <= 0) {
                    clearInterval(this.fadeTimer);
                }
            }, 40);
        }
        /** draw everything to the stage/display */
        draw(display, img) {
            if (display.ctx == null)
                return;
            /// write image to context
            display.ctx.putImageData(img, 0, 0);
            let ctx = this.stageCav.getContext("2d");
            //@ts-ignore
            ctx.mozImageSmoothingEnabled = false;
            //@ts-ignore
            ctx.webkitImageSmoothingEnabled = false;
            ctx.imageSmoothingEnabled = false;
            let outH = display.height;
            let outW = display.width;
            ctx.globalAlpha = 1;
            //- Display Layers
            var dW = img.width - display.viewPoint.x; //- display width
            if ((dW * display.viewPoint.scale) > outW) {
                dW = outW / display.viewPoint.scale;
            }
            var dH = img.height - display.viewPoint.y; //- display height
            if ((dH * display.viewPoint.scale) > outH) {
                dH = outH / display.viewPoint.scale;
            }
            //- drawImage(image,sx,sy,sw,sh,dx,dy,dw,dh)
            ctx.drawImage(display.cav, display.viewPoint.x, display.viewPoint.y, dW, dH, display.x, display.y, Math.trunc(dW * display.viewPoint.scale), Math.trunc(dH * display.viewPoint.scale));
            //- apply fading
            if (this.fadeAlpha != 0) {
                ctx.globalAlpha = this.fadeAlpha;
                ctx.fillStyle = "black";
                ctx.fillRect(display.x, display.y, Math.trunc(dW * display.viewPoint.scale), Math.trunc(dH * display.viewPoint.scale));
            }
        }
    }
    Lemmings.Stage = Stage;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    class MouseMoveEventArguemnts extends Lemmings.Position2D {
        constructor(x = 0, y = 0, deltaX = 0, deltaY = 0, button = false) {
            super(x, y);
            /** delta the mouse move Y */
            this.deltaX = 0;
            /** delta the mouse move Y */
            this.deltaY = 0;
            this.button = false;
            /** position the user starts pressed the mouse */
            this.mouseDownX = 0;
            /** position the user starts pressed the mouse */
            this.mouseDownY = 0;
            this.deltaX = deltaX;
            this.deltaY = deltaY;
            this.button = button;
        }
    }
    Lemmings.MouseMoveEventArguemnts = MouseMoveEventArguemnts;
    class ZoomEventArguemnts extends Lemmings.Position2D {
        constructor(x = 0, y = 0, deltaZoom = 0) {
            super(x, y);
            this.deltaZoom = deltaZoom;
        }
    }
    Lemmings.ZoomEventArguemnts = ZoomEventArguemnts;
    /** handel the user events on the stage */
    class UserInputManager {
        constructor(listenElement) {
            this.mouseDownX = 0;
            this.mouseDownY = 0;
            this.lastMouseX = 0;
            this.lastMouseY = 0;
            this.mouseButton = false;
            this.onMouseMove = new Lemmings.EventHandler();
            this.onMouseUp = new Lemmings.EventHandler();
            this.onMouseDown = new Lemmings.EventHandler();
            this.onDoubleClick = new Lemmings.EventHandler();
            this.onZoom = new Lemmings.EventHandler();
            listenElement.addEventListener("mousemove", (e) => {
                let relativePos = this.getRelativePosition(listenElement, e.clientX, e.clientY);
                this.handelMouseMove(relativePos);
                e.stopPropagation();
                e.preventDefault();
                return false;
            });
            listenElement.addEventListener("touchmove", (e) => {
                if (e.touches.length !== 1){
                    e.preventDefault();
                    return;
                }
                let relativePos = this.getRelativePosition(listenElement, e.touches[0].clientX, e.touches[0].clientY);
                this.handelMouseMove(relativePos);
                e.stopPropagation();
                e.preventDefault();
                return false;
            });
            listenElement.addEventListener("touchstart", (e) => {
                if (e.touches.length !== 1){
                    e.preventDefault();
                    return;
                }
                let relativePos = this.getRelativePosition(listenElement, e.touches[0].clientX, e.touches[0].clientY);
                this.handelMouseDown(relativePos);
                e.stopPropagation();
                e.preventDefault();
                return false;
            });
            listenElement.addEventListener("mousedown", (e) => {
                let relativePos = this.getRelativePosition(listenElement, e.clientX, e.clientY);
                this.handelMouseDown(relativePos);
                e.stopPropagation();
                e.preventDefault();
                return false;
            });
            listenElement.addEventListener("mouseup", (e) => {
                let relativePos = this.getRelativePosition(listenElement, e.clientX, e.clientY);
                this.handelMouseUp(relativePos);
                e.stopPropagation();
                e.preventDefault();
                return false;
            });
            listenElement.addEventListener("mouseleave", (e) => {
                this.handelMouseClear();
            });
            listenElement.addEventListener("touchend", (e) => {
                if (e.changedTouches.length !== 1){
                    e.preventDefault();
                    return;
                }
                let relativePos = this.getRelativePosition(listenElement, e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                this.handelMouseUp(relativePos);
                return false;
            });
            listenElement.addEventListener("touchleave", (e) => {
                this.handelMouseClear();
                return false;
            });
            listenElement.addEventListener("touchcancel", (e) => {
                this.handelMouseClear();
                return false;
            });
            listenElement.addEventListener("dblclick", (e) => {
                let relativePos = this.getRelativePosition(listenElement, e.clientX, e.clientY);
                this.handleMouseDoubleClick(relativePos);
                e.stopPropagation();
                e.preventDefault();
                return false;
            });
            listenElement.addEventListener("wheel", (e) => {
                // let relativePos = this.getRelativePosition(listenElement, e.clientX, e.clientY);
                // this.handeWheel(relativePos, e.deltaY);
                e.stopPropagation();
                e.preventDefault();
                return false;
            });
        }
        getRelativePosition(element, clientX, clientY) {
            var rect = element.getBoundingClientRect();
            const x = (clientX - rect.left) / rect.width * 800;
            const y = (clientY - rect.top) / rect.height * 480;
            return new Lemmings.Position2D(x, y);
        }
        handelMouseMove(position) {
            //- Move Point of View
            if (this.mouseButton) {
                let deltaX = (this.lastMouseX - position.x);
                let deltaY = (this.lastMouseY - position.y);
                //- save start of Mousedown
                this.lastMouseX = position.x;
                this.lastMouseY = position.y;
                let mouseDragArguments = new MouseMoveEventArguemnts(position.x, position.y, deltaX, deltaY, true);
                mouseDragArguments.mouseDownX = this.mouseDownX;
                mouseDragArguments.mouseDownY = this.mouseDownY;
                /// raise event
                this.onMouseMove.trigger(mouseDragArguments);
            }
            else {
                /// raise event
                this.onMouseMove.trigger(new MouseMoveEventArguemnts(position.x, position.y, 0, 0, false));
            }
        }
        handelMouseDown(position) {
            //- save start of Mousedown
            this.mouseButton = true;
            this.mouseDownX = position.x;
            this.mouseDownY = position.y;
            this.lastMouseX = position.x;
            this.lastMouseY = position.y;
            /// create new event handler
            this.onMouseDown.trigger(position);
        }
        handleMouseDoubleClick(position) {
            this.onDoubleClick.trigger(position);
        }
        handelMouseClear() {
            this.mouseButton = false;
            this.mouseDownX = 0;
            this.mouseDownY = 0;
            this.lastMouseX = 0;
            this.lastMouseY = 0;
        }
        handelMouseUp(position) {
            this.handelMouseClear();
            this.onMouseUp.trigger(new Lemmings.Position2D(position.x, position.y));
        }
        /** Zoom view
         * todo: zoom to mouse pointer */
        handeWheel(position, deltaY) {
            if (deltaY < 0) {
                this.onZoom.trigger(new ZoomEventArguemnts(position.x, position.y, 1));
            }
            if (deltaY > 0) {
                this.onZoom.trigger(new ZoomEventArguemnts(position.x, position.y, -1));
            }
        }
    }
    Lemmings.UserInputManager = UserInputManager;
})(Lemmings || (Lemmings = {}));
var Lemmings;
(function (Lemmings) {
    /** Camera Point to display the game */
    class ViewPoint {
        constructor(x, y, scale) {
            this.x = x;
            this.y = y;
            this.scale = scale;
        }
        /** transforma a X coordinate from display space to game-world space */
        getSceneX(x) {
            return Math.trunc(x / this.scale) + Math.trunc(this.x);
        }
        /** transforma a Y coordinate from display space to game-world space */
        getSceneY(y) {
            return Math.trunc(y / this.scale) + Math.trunc(this.y);
        }
    }
    Lemmings.ViewPoint = ViewPoint;
})(Lemmings || (Lemmings = {}));