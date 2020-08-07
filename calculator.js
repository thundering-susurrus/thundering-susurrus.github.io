var shittyJson = `
{
	"base_height": 72.0,
	"dimensions" : [
		{
			"name": "foot",
			"size": 10.0
		},
		{
			"name": "hand",
			"size": 8.0
		},
		{
			"name": "calf",
			"size": 21.0
		},
		{
			"name": "shoulders",
			"size": 18.0
		},
		{
			"name": "head",
			"size": 9.0
		}
	]
}
`;
var myData = JSON.parse(shittyJson);

function computeWeight() {
	var humanWeight = parseInt($("#lbs_input").val());
	var humanHeight = heightAsFeet(parseInt($("#human_ft_input").val()), parseInt($("#human_in_input").val()));
	var giantHeight = heightAsFeet(parseInt($("#giant_ft_input").val()), parseInt($("#giant_in_input").val()));
	var heightRatio = giantHeight/humanHeight;
	return humanWeight * (heightRatio ** 3);
}

function computeLength(baseLength, baseHeight, giantHeight) {
	var heightRatio = giantHeight/baseHeight;
	return baseLength*heightRatio;
}

function heightAsFeet(feet, inches) {
	return feet + inches / 12.0
}

function formatInt(x) {
	return Math.round(x)
}

function buildDimensions() {
	var dimensions = myData['dimensions']
	for (dimension of dimensions) {
		var name = dimension['name']
		var size = dimension['size']
		var input_id = 'body_part_'+name+"_input"
		var htmlString = "<p>"+name+"</p><p><input type=\"text\" disabled=\"disabled\" id=\""+input_id+"\" + value=\""+size+"\"></input><label>"+"ft"+"</label></p>"
		$("#parts_div").append(htmlString)
	}
}

function updateDimensions() {
	var giantHeight = heightAsFeet(parseInt($("#giant_ft_input").val()), parseInt($("#giant_in_input").val()));
	var giantWeight = computeWeight()
	$("#giant_lbs").val(formatInt(giantWeight))

	var dimensions = myData['dimensions']
	var baseHeight = myData['base_height']
	for (dimension of dimensions) {
		var name = dimension['name']
		var baseLength = dimension['size']
		var newLength = computeLength(baseLength, baseHeight, giantHeight)
		newLength = formatInt(newLength)
		var input_id = 'body_part_'+name+"_input"
		$("#"+input_id).attr("value", newLength)
	}
}

$(document).ready(function() {
	// prevent non-numeric entry
	$("input").keypress(function(e) {
		if (
			e.key.length === 1 && e.key !== '.' && isNaN(e.key) && !e.ctrlKey ||
			e.key === '.' && e.target.value.toString().indexOf('.') > -1
		) {
			e.preventDefault();
		}
	});

	$("input").change(function() {
		updateDimensions()
	});

	buildDimensions()
})