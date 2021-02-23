import { Coordinates } from '../../../types';
import { safeNumber } from '../../../utils';
import { cubicCurveToPoints } from "./bezier";

const PATH_COMMANDS_REGEX = /(?:(M(?:-?\d+(?:\.\d+)?(?:,| )?){2})|(m(?:-?\d+(?:\.\d+)?(?:,| )?){2})|(?:(L(?:-?\d+(?:\.\d+)?(?:,| )?){2}))|(l(?:-?\d+(?:\.\d+)?(?:,| )?){2})|(H-?\d+(?:\.\d+)?)|(V-?\d+(?:\.\d+)?)|(h-?\d+(?:\.\d+)?)|(v-?\d+(?:\.\d+)?)|(C(?:-?\d+(?:\.\d+)?(?:\.\d+)?(?:,| )?){6})|(c(?:-?\d+(?:\.\d+)?(?:\.\d+)?(?:,| )?){6})|(z|Z))/g;
const COMMAND_REGEX = /(?:[MmLlHhVvCcZz]|(-?\d+(?:\.\d+)?))/g;

function expandCoordinates(from: number[], to: number[], indexToExpand: number): Coordinates[] {
  const distance = Math.round(to[indexToExpand] - from[indexToExpand]);
  const count = Math.floor(Math.abs(distance / 10));
  const step = distance < 0 ? -10 : 10;
  const computedCoordinates = [];
  
  for (let i = 1; i <= count; i++) {
    const newCoordinate = safeNumber(from[indexToExpand] + (i * step));

    if (indexToExpand === 0) {
      computedCoordinates.push([
        newCoordinate,
        from[1],
      ]);
    } else if (indexToExpand === 1) {
      computedCoordinates.push([
        from[0],
        newCoordinate,
      ]);
    } else {
      // @TODO
    }
  }

  if (Math.abs(distance % 10) > 10) {
    return computedCoordinates;
  }

  return [...computedCoordinates, to];
}

/**
 * Convert a SVG path data to list of coordinates
 */
export default function pathToPoints(path: string): Coordinates[][] {
  const commands = path.match(PATH_COMMANDS_REGEX);
  const elements = [];
  let currentPosition = [0, 0];
  let points = [];

  if (!commands?.length) {
    throw new Error("No commands found in given path");
  }

  for (const command of commands) {
    console.groupCollapsed(command);

    const commandMatch = command.match(COMMAND_REGEX);

    if (commandMatch?.length) {
      const commandType = commandMatch[0];
      let coordinates = commandMatch
        .slice(1, commandMatch.length)
        .map((coordinate) => safeNumber(Number(coordinate)));
      const isRelative = commandType.toLowerCase() === commandType;

      console.log("Commande type:", commandType);
      console.log("Coordinates:", coordinates);

      switch (commandType) {
        case "M":
        case "m":
        case "L":
        case "l":
          if (isRelative) {
            coordinates = [
              currentPosition[0] + coordinates[0],
              currentPosition[1] + coordinates[1],
            ];
          }

          points.push(coordinates);

          currentPosition = coordinates;

          break;
        case "H":
        case "h": {
          let targetCoordinate = [
            coordinates[0],
            currentPosition[1],
          ];

          if (isRelative) {
            targetCoordinate = [
              currentPosition[0] + coordinates[0],
              currentPosition[1],
            ];
          }

          const coordinatesList = expandCoordinates(currentPosition, targetCoordinate, 0);

          points.push(...coordinatesList);

          currentPosition = coordinatesList[coordinatesList.length - 1];

          break;
        }
        case "V":
        case "v": {
          let targetCoordinate = [
            currentPosition[0],
            coordinates[0],
          ];

          if (isRelative) {
            targetCoordinate = [
              currentPosition[0],
              currentPosition[1] + coordinates[0],
            ];
          }

          const coordinatesList = expandCoordinates(currentPosition, targetCoordinate, 1);

          points.push(...coordinatesList);

          currentPosition = coordinatesList[coordinatesList.length - 1];

          break;
        }
        case "C":
        case "c": {
          const controlPoints = [currentPosition];

          if (isRelative) {
            controlPoints.push(
              [
                currentPosition[0] + coordinates[0],
                currentPosition[1] + coordinates[1],
              ],
              [
                currentPosition[0] + coordinates[2],
                currentPosition[1] + coordinates[3],
              ],
              [
                currentPosition[0] + coordinates[4],
                currentPosition[1] + coordinates[5],
              ],
            );
          } else {
            controlPoints.push(
              [coordinates[0], coordinates[1]],
              [coordinates[2], coordinates[3]],
              [coordinates[4], coordinates[5]],
            );
          }

          console.log('Control points:', controlPoints);

          const coordinatesList = cubicCurveToPoints(controlPoints);

          console.log('Curve coordinates:', coordinatesList);

          points.push(...coordinatesList);

          currentPosition = coordinatesList[coordinatesList.length - 1];

          break;
        }
        case "Z":
        case "z":
          if (points.length) {
            elements.push(points);
          }
      
          points = [];

          break;
      }
    } else {
      console.error("Unsupported command provided will be ignored:", command);
    }

    console.log('Current position:', currentPosition);
    console.log('Last point:', points[points.length - 1]);
    console.groupEnd();
  }

  return elements;
}