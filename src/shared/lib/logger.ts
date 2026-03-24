// Application logger utility

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    if (this.isDevelopment) {
      const style = this.getLogStyle(level);
      console.log(`%c[${entry.timestamp}] [${level}] ${message}`, style, data);
    } else if (level === LogLevel.ERROR || level === LogLevel.WARN) {
      console.log(entry);
    }
  }

  private getLogStyle(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: 'color: gray;',
      [LogLevel.INFO]: 'color: blue;',
      [LogLevel.WARN]: 'color: orange; font-weight: bold;',
      [LogLevel.ERROR]: 'color: red; font-weight: bold;',
    };
    return styles[level];
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any) {
    this.log(LogLevel.ERROR, message, data);
  }
}

export const logger = new Logger();
