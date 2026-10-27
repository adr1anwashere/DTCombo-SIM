/**
 * Starter C Code Templates for DT-COMBO AVR-51 Starter Kit (ATmega8535)
 * Written for avr-gcc / Microchip Studio / CodeVisionAVR compatibility.
 */

export interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  fCpu: number;
  code: string;
}

export const TEMPLATES: CodeTemplate[] = [
  {
    id: 'prog-1-1',
    name: 'Praktikum 1.1: Port B Output',
    description: 'Program 1.1: Port B sebagai Output (Blinks PORTB every 1 second at 1 MHz)',
    fCpu: 1000000,
    code: `#define F_CPU 1000000UL
#include <avr/io.h>
#include <util/delay.h>

int main(void)
{
    DDRB = 0xFF;

    while (1)
    {
        PORTB = 0xFF;
        _delay_ms(1000);
        PORTB = 0x00;
        _delay_ms(1000);
    }
}
`,
  },
  {
    id: 'prog-1-2',
    name: 'Praktikum 1.2: Port C Input & Port B Output',
    description: 'Program 1.2: PINC 0b11111110 turns ON PORTB, 0b11111101 turns OFF PORTB',
    fCpu: 1000000,
    code: `#include <avr/io.h>

int main(void)
{
    DDRC = 0x00;
    PORTC = 0xFF;
    DDRB = 0xFF;

    while (1)
    {
        if (PINC == 0b11111110)
        {
            PORTB = 0b00000000;
        }
        else if (PINC == 0b11111101)
        {
            PORTB = 0b11111111;
        }
    }
}
`,
  },
  {
    id: 'prog-2-1',
    name: 'Praktikum 2.1: USART Receiver to Port B LEDs',
    description: 'Receives byte at 4800 Baud via USART and displays inverted bits on PORTB LEDs',
    fCpu: 1000000,
    code: `#define F_CPU 1000000UL
#include <avr/io.h>

#define BAUD 4800
#define BAUDRATE ((F_CPU)/(BAUD*16UL)-1)

unsigned char usart_receive()
{
    while((UCSRA & (1<<RXC)) == 0);
    return UDR;
}

int main(void)
{
    unsigned char received;

    DDRB = 0xFF;
    PORTB = 0xFF;

    UBRRH = BAUDRATE>>8;
    UBRRL = BAUDRATE;

    UCSRB |= 1<<RXEN;
    UCSRC |= 1<<URSEL | 1<<UCSZ1 | 1<<UCSZ0;

    while (1)
    {
        received = usart_receive();

        PORTB = ~(received);
    }
}
`,
  },
  {
    id: 'blink-led',
    name: '1. Blink LEDs (PORTC Active-Low)',
    description: 'Blinks all 8 LEDs on PORTC every 500ms. Note: LEDs on DT-COMBO are active-low (0 = ON).',
    fCpu: 4000000,
    code: `/*
 * DT-COMBO AVR-51 Starter Kit - Experiment 1: Blink LEDs
 * Target: ATmega8535 @ 4.0 MHz (External Crystal)
 * Peripherals: 8 SMD LEDs connected to PORTC (Header J22 -> J9)
 * Note: LEDs are ACTIVE-LOW (Logic 0 turns LED ON, Logic 1 turns LED OFF)
 */

#define F_CPU 4000000UL
#include <avr/io.h>
#include <util/delay.h>

int main(void) {
    // Configure all 8 pins of PORTC as OUTPUT
    DDRC = 0xFF;

    while (1) {
        // Turn all LEDs ON (Active-Low: 0x00)
        PORTC = 0x00;
        _delay_ms(500);

        // Turn all LEDs OFF (Active-Low: 0xFF)
        PORTC = 0xFF;
        _delay_ms(500);
    }

    return 0;
}
`,
  },

  {
    id: 'running-led',
    name: '2. Running LED Chaser (PORTC)',
    description: 'Sequentially shifts a single illuminated LED from LED0 to LED7 and back.',
    fCpu: 4000000,
    code: `/*
 * DT-COMBO AVR-51 Starter Kit - Experiment 2: Running LED
 * Target: ATmega8535 @ 4.0 MHz
 * Peripherals: 8 SMD LEDs on PORTC (Active-Low)
 */

#define F_CPU 4000000UL
#include <avr/io.h>
#include <util/delay.h>

int main(void) {
    DDRC = 0xFF; // Set PORTC as Output

    while (1) {
        // Shift left: LED0 -> LED7
        for (uint8_t i = 0; i < 8; i++) {
            PORTC = ~(1 << i); // Active-low: 0 at position i
            _delay_ms(150);
        }

        // Shift right: LED6 -> LED1
        for (int8_t i = 6; i >= 1; i--) {
            PORTC = ~(1 << i);
            _delay_ms(150);
        }
    }

    return 0;
}
`,
  },

  {
    id: 'button-to-led',
    name: '3. Push Buttons to LEDs (PORTA -> PORTC)',
    description: 'Reads 8 tactile switches on PORTA and mirrors their states to LEDs on PORTC.',
    fCpu: 4000000,
    code: `/*
 * DT-COMBO AVR-51 Starter Kit - Experiment 3: Push Buttons to LEDs
 * Target: ATmega8535 @ 4.0 MHz
 * Wiring:
 *   - Switches: Header J23 connected to PORTA (J7)
 *   - LEDs:     Header J22 connected to PORTC (J9)
 * Both switches and LEDs are ACTIVE-LOW.
 */

#define F_CPU 4000000UL
#include <avr/io.h>
#include <util/delay.h>

int main(void) {
    // Configure PORTA as INPUT with internal pull-ups enabled
    DDRA = 0x00;
    PORTA = 0xFF;

    // Configure PORTC as OUTPUT for LEDs
    DDRC = 0xFF;
    PORTC = 0xFF; // Turn off all LEDs initially

    while (1) {
        // Read buttons from PINA
        // When button is pressed, PINA bit is 0
        // Writing 0 to PORTC turns LED ON
        uint8_t buttons = PINA;
        PORTC = buttons; // Mirror switch state directly to LEDs

        _delay_ms(20); // Software debounce
    }

    return 0;
}
`,
  },

  {
    id: 'lcd-hello',
    name: '4. 8x2 Character LCD (HD44780 on PORTB)',
    description: 'Initializes the onboard 8x2 LCD in 4-bit mode and prints text and a counter.',
    fCpu: 4000000,
    code: `/*
 * DT-COMBO AVR-51 Starter Kit - Experiment 4: 8x2 Character LCD
 * Controller: HD44780 compatible
 * Mode: 4-bit Data Mode
 * Wiring (PORTB):
 *   - RS: PB0
 *   - RW: PB1 (GND/0)
 *   - E:  PB2
 *   - D4: PB4
 *   - D5: PB5
 *   - D6: PB6
 *   - D7: PB7
 */

#define F_CPU 4000000UL
#include <avr/io.h>
#include <util/delay.h>
#include <stdio.h>

#define LCD_PORT PORTB
#define LCD_DDR  DDRB
#define LCD_RS   0
#define LCD_RW   1
#define LCD_E    2

void lcd_pulse_e(void) {
    LCD_PORT |= (1 << LCD_E);
    _delay_us(10);
    LCD_PORT &= ~(1 << LCD_E);
    _delay_us(50);
}

void lcd_send_nibble(uint8_t nibble) {
    // Clear upper 4 data bits on PORTB, keep RS/RW/E low
    LCD_PORT = (LCD_PORT & 0x0F) | (nibble & 0xF0);
    lcd_pulse_e();
}

void lcd_send_byte(uint8_t is_data, uint8_t byte) {
    if (is_data) {
        LCD_PORT |= (1 << LCD_RS);
    } else {
        LCD_PORT &= ~(1 << LCD_RS);
    }
    LCD_PORT &= ~(1 << LCD_RW); // RW = 0 (Write)

    // Send High Nibble first
    lcd_send_nibble(byte & 0xF0);
    // Send Low Nibble
    lcd_send_nibble((byte << 4) & 0xF0);

    if (!is_data && byte <= 0x02) {
        _delay_ms(2); // Clear/Home takes longer
    } else {
        _delay_us(50);
    }
}

void lcd_command(uint8_t cmd) {
    lcd_send_byte(0, cmd);
}

void lcd_data(uint8_t data) {
    lcd_send_byte(1, data);
}

void lcd_print(const char *str) {
    while (*str) {
        lcd_data(*str++);
    }
}

void lcd_init(void) {
    LCD_DDR = 0xFF; // All pins output
    LCD_PORT = 0x00;
    _delay_ms(30);

    // Initialization sequence for 4-bit mode
    lcd_send_nibble(0x30);
    _delay_ms(5);
    lcd_send_nibble(0x30);
    _delay_us(150);
    lcd_send_nibble(0x30);
    _delay_us(150);
    lcd_send_nibble(0x20); // Switch to 4-bit mode
    _delay_us(150);

    // Function set: 4-bit, 2 lines, 5x8 font
    lcd_command(0x28);
    // Display control: Display ON, Cursor OFF, Blink OFF
    lcd_command(0x0C);
    // Clear display
    lcd_command(0x01);
    // Entry mode set: Increment cursor
    lcd_command(0x06);
}

int main(void) {
    lcd_init();

    // Line 1 (8 chars max): "DT-COMBO"
    lcd_command(0x80);
    lcd_print("DT-COMBO");

    uint8_t count = 0;
    char buffer[16];

    while (1) {
        // Line 2: "CNT: " + count
        lcd_command(0xC0);
        snprintf(buffer, sizeof(buffer), "CNT: %3d", count++);
        lcd_print(buffer);

        _delay_ms(1000);
    }

    return 0;
}
`,
  },

  {
    id: 'usart-echo',
    name: '5. USART Serial Echo (9600 Baud)',
    description: 'Transmits a welcome banner over serial (PD1/TXD) and echoes received characters (PD0/RXD).',
    fCpu: 4000000,
    code: `/*
 * DT-COMBO AVR-51 Starter Kit - Experiment 5: USART Serial
 * Target: ATmega8535 @ 4.0 MHz
 * Baud Rate: 9600 Baud, 8 Data Bits, 1 Stop Bit, No Parity
 * Pins: PD0 (RXD), PD1 (TXD) connected to onboard MAX232 / COM1
 */

#define F_CPU 4000000UL
#define BAUD 9600
#define UBRR_VAL ((F_CPU / (16UL * BAUD)) - 1)

#include <avr/io.h>
#include <util/delay.h>

void usart_init(unsigned int ubrr) {
    // Set baud rate
    UBRRH = (unsigned char)(ubrr >> 8);
    UBRRL = (unsigned char)ubrr;
    // Enable Receiver and Transmitter
    UCSRB = (1 << RXEN) | (1 << TXEN);
    // Set frame format: 8 data bits, 1 stop bit
    // Note: URSEL bit (bit 7) must be 1 to write to UCSRC instead of UBRRH
    UCSRC = (1 << URSEL) | (1 << UCSZ1) | (1 << UCSZ0);
}

void usart_transmit(char data) {
    // Wait for empty transmit buffer
    while (!(UCSRA & (1 << UDRE)));
    // Put data into buffer, sends the data
    UDR = data;
}

char usart_receive(void) {
    // Wait for data to be received
    while (!(UCSRA & (1 << RXC)));
    // Get and return received data from buffer
    return UDR;
}

void usart_print(const char *str) {
    while (*str) {
        usart_transmit(*str++);
    }
}

int main(void) {
    usart_init(UBRR_VAL);
    _delay_ms(100);

    usart_print("\r\n=================================\r\n");
    usart_print("  DT-COMBO AVR-51 / ATmega8535  \r\n");
    usart_print("  Serial Terminal Echo Ready!   \r\n");
    usart_print("=================================\r\n");

    while (1) {
        char ch = usart_receive();
        // Echo character back
        usart_transmit(ch);
        if (ch == '\r') {
            usart_transmit('\n');
        }
    }

    return 0;
}
`,
  },

  {
    id: 'timer0-interrupt',
    name: '6. Timer0 Overflow Interrupt',
    description: 'Configures Timer0 with 1024 prescaler and toggles PORTC LEDs inside an ISR.',
    fCpu: 4000000,
    code: `/*
 * DT-COMBO AVR-51 Starter Kit - Experiment 6: Timer0 Interrupt
 * Target: ATmega8535 @ 4.0 MHz
 * Peripheral: 8 LEDs on PORTC
 */

#define F_CPU 4000000UL
#include <avr/io.h>
#include <avr/interrupt.h>

volatile uint8_t overflow_count = 0;

ISR(TIMER0_OVF_vect) {
    overflow_count++;
    if (overflow_count >= 15) { // ~1 second toggle
        overflow_count = 0;
        PORTC = ~PORTC; // Toggle LEDs
    }
}

int main(void) {
    DDRC = 0xFF;   // LEDs as Output
    PORTC = 0xAA;  // Initial alternating pattern

    // Configure Timer0:
    // Prescaler 1024: CS02=1, CS01=0, CS00=1
    TCCR0 = (1 << CS02) | (1 << CS00);

    // Enable Timer0 Overflow Interrupt
    TIMSK |= (1 << TOIE0);

    // Enable Global Interrupts
    sei();

    while (1) {
        // Main loop is free to do other tasks!
    }

    return 0;
}
`,
  },

  {
    id: 'adc-potentiometer',
    name: '7. ADC Reader (PA0 Potentiometer -> LEDs)',
    description: 'Reads analog voltage on PA0 (ADC Channel 0) and displays the upper 8 bits on PORTC LEDs.',
    fCpu: 4000000,
    code: `/*
 * DT-COMBO AVR-51 Starter Kit - Experiment 7: ADC Potentiometer
 * Target: ATmega8535 @ 4.0 MHz
 * Input:  PA0 (ADC Channel 0)
 * Output: PORTC (8 SMD LEDs)
 */

#define F_CPU 4000000UL
#include <avr/io.h>
#include <util/delay.h>

void adc_init(void) {
    // AVCC with external capacitor at AREF pin
    // ADLAR = 1 (Left Adjust Result, so ADCH has the 8 MSBs)
    ADMUX = (1 << REFS0) | (1 << ADLAR);

    // ADEN: Enable ADC
    // ADPS2:0 = 110 (Prescaler 64: 4 MHz / 64 = 62.5 kHz)
    ADCSRA = (1 << ADEN) | (1 << ADPS2) | (1 << ADPS1);
}

uint8_t adc_read_8bit(void) {
    // Start conversion
    ADCSRA |= (1 << ADSC);

    // Wait for conversion to complete
    while (ADCSRA & (1 << ADSC));

    // Return the 8 most significant bits
    return ADCH;
}

int main(void) {
    DDRC = 0xFF; // LEDs as Output
    adc_init();

    while (1) {
        uint8_t value = adc_read_8bit();
        // Display value on LEDs (inverted because active-low)
        PORTC = ~value;
        _delay_ms(50);
    }

    return 0;
}
`,
  },
];
