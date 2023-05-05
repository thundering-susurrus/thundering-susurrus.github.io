// Compute the weight of the character based on their height
function computeCharacterWeight(useMetric) {
  const viewerHeight = getViewerHeight(useMetric);
  const characterHeight = getCharacterHeight(useMetric);
  const heightRatio = characterHeight / viewerHeight;
  const weightInputId = useMetric ? '#kgs_input' : '#lbs_input';
  const humanWeight = parseFloat($(weightInputId).val());
  return humanWeight * (heightRatio ** 3);
}

// Get character height from input fields
function getCharacterHeight(useMetric) {
  const parseValueOrZero = (value) => parseFloat(value) || 0;

  if (useMetric) {
    return toMeters(parseValueOrZero($("#giant_m_input").val()), parseValueOrZero($("#giant_cm_input").val()));
  } else {
    return toFeet(parseValueOrZero($("#giant_ft_input").val()), parseValueOrZero($("#giant_in_input").val()));
  }
}

// Get viewer height from input fields
function getViewerHeight(useMetric) {
	const parseValueOrZero = (value) => parseFloat(value) || 0;

	if (useMetric) {
		return toMeters(parseValueOrZero($("#human_m_input").val()), parseValueOrZero($("#human_cm_input").val()));
	} else {
		return toFeet(parseValueOrZero($("#human_ft_input").val()), parseValueOrZero($("#human_in_input").val()));
	}
}

function toMeters(meters, centimeters) {
	return meters + centimeters/100.0
}

function toFeet(feet, inches) {
	return feet + inches/12.0
}

/**
 * Computes the absolute or relative length of an object.
 *
 * @param {number} baseLength - The length of the object on a normal human.
 * @param {number} baseHeight - The height of a normal human.
 * @param {number} characterHeight - The height of the character.
 * @param {number} viewerHeight - The height of the person viewing the character.
 * @param {boolean} useRelative - If true, calculated the relative/perceived length of the object from the 
   perspective of the viewer; otherwise, calculates the absolute length.
 * @returns {number} - The computed absolute or relative length of the object.
 */
function computeLength(baseLength, baseHeight, characterHeight, viewerHeight, useRelative) {
	let heightRatio
	if (useRelative) {
		heightRatio = characterHeight / viewerHeight;
	} else {
		heightRatio = characterHeight / baseHeight;
	}
	return baseLength * heightRatio;
}

// Formats feet and inches prettily for display
function formatFeet(f) {
  if (f >= 100) {
    const feet = Math.round(f);
    return `${feet} ft`;
  } else if (f >= 1 && f < 100) {
    const feet = Math.floor(f);
    const inches = Math.round((f - feet) * 12);
    const feetString = feet > 0 ? `${feet} ft` : '';
    const inchesString = inches > 0 ? `${inches} in` : '';
    return feetString + (feetString && inchesString ? ' ' : '') + inchesString;
  } else if (f >= 1 / 12 && f < 1) {
    const inches = (f * 12).toFixed(1);
    return `${parseFloat(inches)} in`;
  } else {
    const inches = (f * 12).toPrecision(2);
    return `${parseFloat(inches)} in`;
  }
}

// Formats meters prettily for display. Supports km, m, cm, and mm.
function formatMeters(m) {
  if (m >= 1 && m < 1000) {
    const meters = Math.floor(m);
    const centimeters = Math.round((m - meters) * 100);
    const metersString = meters > 0 ? `${meters} m` : '';
    const centimetersString = centimeters > 0 ? `${centimeters} cm` : '';
    return metersString + (metersString && centimetersString ? ' ' : '') + centimetersString;
  } else if (m >= 1000 && m < 10000) {
    const kilometers = (m / 1000).toFixed(2);
    return `${parseFloat(kilometers)} km`;
  } else if (m >= 10000 && m < 100000) {
    const kilometers = (m / 1000).toFixed(1);
    return `${parseFloat(kilometers)} km`;
  } else if (m >= 100000) {
    const kilometers = Math.round(m / 1000);
    return `${kilometers} km`;
  } else if (m >= 0.01 && m < 1) {
    const centimeters = (m * 100).toFixed(1);
    return `${parseFloat(centimeters)} cm`;
  } else {
    const millimeters = (m * 1000).toPrecision(2);
    return `${parseFloat(millimeters)} mm`;
  }
}

function formatWeight(w) {
	if (w < 10) {
		return w.toPrecision(2);
	} else {
		return Math.round(w);
	}
}

function formatUnit(x, base) {
	// Assumes x is in the "bigger" units (ie ft or m)
	let biggerUnit = Math.floor(x)
	let smallerUnit = Math.round((x%1)*base)
	return [biggerUnit, smallerUnit]
}

function partToId(dimension) {
  return "body_part_" + dimension['id'] + "_elt";
}

function buildDimensions(myData) {
	// Run once on startup
	for (const [table_name, dimensions] of Object.entries(myData['tables'])) {
		for (dimension of dimensions) {
			let name = dimension['name']
			let size = formatFeet(dimension['size'])
			let input_id = partToId(dimension)
			let htmlString = '<tr><td>' + name + '</td><td id=\"' + input_id + '\">' + size + '</td></tr>'
			$("#" + table_name + "_table").append(htmlString)
		}
	}

	updateDimensions(myData)
}

function swapUnits(useMetric) {
	if (useMetric) {
		$(".imperial").hide()
		$(".metric").show()
	} else {
		$(".imperial").show()
		$(".metric").hide()
	}
}

function swapPerspective(useRelative) {
	if (useRelative) {
		$(".relative").show()
		$(".absolute").hide()
	} else {
		$(".relative").hide()
		$(".absolute").show()
	}
}

function getPerspectiveHeightRatio() {
	getViewerHeight(useMetric)
}

function updateRelHeight(characterHeight, viewerHeight, useMetric, baseHeight) {
	let heightRatio = characterHeight / viewerHeight
	if (useMetric) {
		let baseHeightM = baseHeight * 0.3048
		let relHeight = heightRatio * baseHeightM
		let [m, cm] = formatUnit(relHeight, 100)
		$("#giant_m_rel").val(m)
		$("#giant_cm_rel").val(cm)
	} else {
		let relHeight = heightRatio * baseHeight
		let [ft, inch] = formatUnit(relHeight, 12)
		$("#giant_ft_rel").val(ft)
		$("#giant_in_rel").val(inch)
	}
}

// Runs every time you change an input field
function updateDimensions(myData) {
	let useMetric = $("input[name=unitsRadio]:checked").val() == "metric"
	let useRelative = $("input[name=modeRadio]:checked").val() == "relative"

	// Toggle settings
	swapUnits(useMetric)
	swapPerspective(useRelative)

	// Get and set weight
	let giantWeight = computeCharacterWeight(useMetric);
	let weightInputId = useMetric ? '#giant_kgs' : '#giant_lbs';
	const weightStr = formatWeight(giantWeight);
	$(weightInputId).val(weightStr);

	// Update body part lengths
	let characterHeight = getCharacterHeight(useMetric)
	let viewerHeight = getViewerHeight(useMetric)
	let baseHeight = myData['base_height']

	for (const [table_name, dimensions] of Object.entries(myData['tables'])) {
		for (const dimension of dimensions) {
			const { name, size: baseLength } = dimension;
			let newLength = computeLength(baseLength, baseHeight, characterHeight, viewerHeight, useRelative);
			newLength = useMetric ? formatMeters(newLength) : formatFeet(newLength);
			const input_id = partToId(dimension);
			$("#" + input_id).text(newLength);
		}
	}

	// Update relative height
	updateRelHeight(characterHeight, viewerHeight, useMetric, baseHeight)
}

// Runs on start
$(document).ready(function() {
  $.getJSON("data.json").done(function(originalData) {
    // Make changes to the originalData here
    let myData = processMyData(originalData); 

    // Call buildDimensions with the updated myData
    buildDimensions(myData);

    // Set up event listener for input changes and call updateDimensions with updated myData
    $("input").change(function() {
      updateDimensions(myData);
    });
  });

  // Prevent non-numeric entry
  $("input").keypress(function(e) {
    if (
      e.key.length === 1 && e.key !== '.' && isNaN(e.key) && !e.ctrlKey ||
      e.key === '.' && e.target.value.toString().indexOf('.') > -1
    ) {
      e.preventDefault();
    }
  });
});


// Convert stored lengths from inches to feet.
function processMyData(data) {
	data['base_height'] = data['base_height']/12.0;
	for (const [table_name, dimensions] of Object.entries(data['tables'])) {
		for (dimension of dimensions) {
			dimension['size'] = dimension['size']/12.0
		}
	}

	return data;
}