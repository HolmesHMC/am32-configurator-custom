/**
 * Holmes Hobbies premade flash presets.
 *
 * Each preset is the Crawler Defaults base with only a handful of
 * fields overridden.  Values are raw EEPROM bytes (1:1 with how the
 * AM32 firmware reads them) — the same convention as the inline
 * CRAWLER_DEFAULTS map and the TrailLink phone app.
 *
 * Only tunable settings — no structural/version fields (BOOT_BYTE,
 * LAYOUT_REVISION, BOOT_LOADER_REVISION, MAIN_REVISION, SUB_REVISION).
 *
 * Base values match eeprom_default.bin as of 2026-04-09.
 *
 * Overrides per preset (2026-06-01, per Holmes):
 *   Inrunner  — Sine Power 6,  Motor Poles 10, Transition Point 80%
 *   Outrunner — Sine Power 5,  Motor Poles 14, Transition Point 80%
 *   Micro     — Sine Power 10, Motor Poles 12, Transition Point 120%,
 *               Startup Duty 2%
 *
 * Field name -> EEPROM key -> on-screen value mapping (configurator.vue):
 *   "Sine Power"                          = SINE_MODE_POWER   (1-10, raw 1:1)
 *   "Sine to Sensorless transition point" = STARTUP_POWER     (50-150%, raw 1:1)
 *   "Motor poles"                         = MOTOR_POLES       (2-36, raw 1:1)
 *   "Startup Duty"                        = MINIMUM_DUTY_CYCLE (0-25%, displayFactor 0.5)
 *                                             0.5% -> raw 1 (base), 2.0% -> raw 4
 *
 * NOTE: the "transition point" is STARTUP_POWER, NOT SINE_MODE_RANGE.
 * SINE_MODE_RANGE is the "Sine Mode Throttle Range" (5-25) and is left
 * at the crawler base.
 */

export type EscSettingsMap = Record<string, number | number[]>;

export interface EscPreset {
    id: string;
    name: string;
    description: string;
    settings: EscSettingsMap;
}

/**
 * Holmes Hobbies crawler defaults — raw EEPROM byte values.
 * Shared base for every premade flash below.
 */
export const CRAWLER_DEFAULTS: EscSettingsMap = {
    MAX_RAMP: 14, // 0x05
    MINIMUM_DUTY_CYCLE: 1, // 0x06
    DISABLE_STICK_CALIBRATION: 0, // 0x07
    ABSOLUTE_VOLTAGE_CUTOFF: 10, // 0x08
    CURRENT_P: 100, // 0x09
    CURRENT_I: 0, // 0x0A
    CURRENT_D: 100, // 0x0B
    ACTIVE_BRAKE_POWER: 0, // 0x0C
    MOTOR_DIRECTION: 0, // 0x11
    BIDIRECTIONAL_MODE: 1, // 0x12
    SINUSOIDAL_STARTUP: 1, // 0x13
    COMPLEMENTARY_PWM: 1, // 0x14
    VARIABLE_PWM_FREQUENCY: 1, // 0x15
    STUCK_ROTOR_PROTECTION: 0, // 0x16
    TIMING_ADVANCE: 26, // 0x17
    PWM_FREQUENCY: 24, // 0x18
    STARTUP_POWER: 80, // 0x19
    MOTOR_KV: 55, // 0x1A
    MOTOR_POLES: 14, // 0x1B
    BRAKE_ON_STOP: 1, // 0x1C
    STALL_PROTECTION: 1, // 0x1D
    BEEP_VOLUME: 5, // 0x1E
    INTERVAL_TELEMETRY: 0, // 0x1F
    SERVO_LOW_THRESHOLD: 128, // 0x20
    SERVO_HIGH_THRESHOLD: 128, // 0x21
    SERVO_NEUTRAL: 128, // 0x22
    SERVO_DEAD_BAND: 50, // 0x23
    LOW_VOLTAGE_CUTOFF: 1, // 0x24
    LOW_VOLTAGE_THRESHOLD: 80, // 0x25
    RC_CAR_REVERSING: 0, // 0x26
    USE_HALL_SENSORS: 0, // 0x27
    SINE_MODE_RANGE: 15, // 0x28
    BRAKE_STRENGTH: 10, // 0x29
    RUNNING_BRAKE_LEVEL: 10, // 0x2A
    TEMPERATURE_LIMIT: 143, // 0x2B
    CURRENT_LIMIT: 102, // 0x2C
    SINE_MODE_POWER: 5, // 0x2D
    ESC_PROTOCOL: 0, // 0x2E
    AUTO_ADVANCE: 0, // 0x2F
    STARTUP_MELODY: (new Array(128)).fill(0xFF)
};

export const ESC_PRESETS: EscPreset[] = [
    {
        id: 'inrunner',
        name: 'Inrunner',
        description: 'Inrunner motor — sine power 6, 10 poles, 80% transition point.',
        settings: {
            ...CRAWLER_DEFAULTS,
            SINE_MODE_POWER: 6,
            MOTOR_POLES: 10,
            STARTUP_POWER: 80 // transition point 80%
        }
    },
    {
        id: 'outrunner',
        name: 'Outrunner',
        description: 'Outrunner motor — sine power 5, 14 poles, 80% transition point.',
        settings: {
            ...CRAWLER_DEFAULTS,
            SINE_MODE_POWER: 5,
            MOTOR_POLES: 14,
            STARTUP_POWER: 80 // transition point 80%
        }
    },
    {
        id: 'micro',
        name: 'Micro',
        description: 'Micro motor — sine power 10, 12 poles, 120% transition point, 2% startup duty.',
        settings: {
            ...CRAWLER_DEFAULTS,
            SINE_MODE_POWER: 10,
            MOTOR_POLES: 12,
            STARTUP_POWER: 120, // transition point 120%
            MINIMUM_DUTY_CYCLE: 4 // 2% startup duty (displayFactor 0.5)
        }
    }
];
