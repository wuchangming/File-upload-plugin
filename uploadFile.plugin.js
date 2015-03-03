/***
 * 网站上传插件(一次只能上传一个)
 * 
 * $.wqUpLoadFilePlugin({
		jqSelector : $('XXX') ,  //jquery对象    ----- （必填）
		data : {                 //data的属性最后会以input的形式提交：例如,<input name="type" value="test" />
			type : 'test'                
		},
		success : function(data){   data结果为：//{"results":[{"originName":"aa.jpg","success":true,"url":"user%2F655f9f2c54c0dee732ddd049e7223e4c%2Fimg%2Ftest%2F2015-01%2Faa-bd61e466154adcc497dc5682d0703337.jpg"}],"success":true}
			console.log(data);  
		},
		error : function(){
			//TODO 
		},
		beforeSend :function(inputObj){    //参数为<input type="file" />的jquery对象，  获取文件名可以用
			//var 文件信息 = inputObj.val();
			//return false;可以中断上传
		},
		loginNotice : function(){ //未登录提示
		
		},
		complete : function(){
		
		},
		loginCheck : true  //默认为true，是否要检验登录
	});
 */


/**
 * 
 * 获取文件名后缀
 * $.wqUpLoadFilePlugin.getFileSuffix("asdfasdf.jpg")   //返回 "jpg",统一返回小写
 */

/**
 * ie下重新定位所有上传input位置
 * $.wqUpLoadFilePlugin.iePositionFix();
 */
;(function(){
	
	window.document.domain = 'woqu.com';
	
	
	/**
	 * 判断是否ie
	 */
	var ieVersion;
	var ieFlag = (function checkIfIE(){
		var ua = window.navigator.userAgent;
        var msie = ua.indexOf("MSIE ");

        if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)){// If Internet Explorer, return version number
        	ieVersion = parseInt(ua.substring(msie + 5, ua.indexOf(".", msie)));
        	return true;
        }else{             
        	return false;
        }
	})();
	
	
	/**
	 * 
	 */
	$.wqUpLoadFilePlugin = function(opt){
		new UpLoadFile(opt);
	};
	/**
	 * 获取文件名后缀
	 */
	$.wqUpLoadFilePlugin.getFileSuffix = function(string){
		if(string == null || string.split(".").length==1){
			return "";
		}
		return (string.split(".")[string.split(".").length-1]).toLowerCase();
	};
	/**
	 * ie下重新定位input
	 */
	$.wqUpLoadFilePlugin.iePositionFix = function(){
		if(UpLoadInstances != null){
			for(var i=0; i < UpLoadInstances.length;i++){
				positionFix(UpLoadInstances[i]);
			}
		}
	}
	
	/**
	 * iframe回调方法
	 */
	$.wqUploadFileIframeCB = function(_this,index){
		
		
		
		var uploadObj = UpLoadInstances[index];
		
		if(uploadObj == null){
			return;
		}
		
		/**
		 * 标记是不是上传触发的load事件
		 */
		if(uploadObj.sending == false){
			return;
		}
		
		
		/**
		 * 获取iFrame Window对象
		 */
		var iFrameWin = (function(x){
			if(x !== null){
				return x.contentWindow || x.contentDocument;
			}
		})(_this);
		
		var topWin = getTopPageWindow(window);
		
		/**
		 * 解析返回结果为对象
		 */
		var resultObj = parseResult(iFrameWin);
		
		try{
			if(resultObj != null && resultObj.success == true && (resultObj.results)[0].success == true){
				uploadObj.success.call(topWin, resultObj);
			}else{
				if(uploadObj.error != null){
					uploadObj.error.call(topWin);
				}
				if(resultObj != null){
					logErr(resultObj);
				}
			}
		}catch (e) {
			if(uploadObj.error != null){
				uploadObj.error.call(topWin);
			}
			logErr(e);
		}
		
		uploadObj.sending = false;
		//重置
		resetInputFile(uploadObj);
//		$('#' + uploadObj.upLoadFormName + ' input[type=file]').replaceWith('<input type="file" name="file" style="font-size:10000px;position:absolute;right:0px;" />');
//		
//		if(ieFlag){
//			renderInputFile(uploadObj);
//		}
		$.wqUpLoadFilePlugin.iePositionFix();
		if(uploadObj.complete != null){
			uploadObj.complete.call(topWin);
		}
	} 
	
	/**
	 * 缓存上传对象实例
	 */
	var UpLoadInstances = [];
	/**
	 * 提交form
	 */
	var upLoadFormPrefix = 'woqu_upload_File_form';
	/**
	 * 接收跳转Iframe
	 */
	var targetIframePrefix = 'woqu_upload_File_target_iframe';
	
	var defaultUploadURL = window.location.protocol + '//upload.woqu.com/upload?returnType=domainhtml';
	
	/**
	 * 保存生成对象的index
	 */
	var id_index = 0;
	
	/**
	 * @usage 上传文件对象构造方法
	 * @author wuchangming
	 * @email changming.wu@woqu.com
	 * @date 2015年1月12日
	 */
	function UpLoadFile(options){
		var defaults = {
			beforeSend : null,
			jqSelector : null,
			url : defaultUploadURL,
			success : null,
			error : null,
			data : {},
			loginNotice : null,
			complete : null,
			loginCheck : true
		};
		
		var opt = $.extend({},defaults,options);
		//被绑定的元素
		if(opt.jqSelector == null){
			throw new Error('jqSelector 不能为空');
		}
		
		this.selector = opt.jqSelector;
		this.sending = false;
		this.index = id_index++;
		this.upLoadFormName = upLoadFormPrefix + this.index;
		this.targetIframeName = targetIframePrefix + this.index;
		this.url = opt.url;
		this.beforeSend = opt.beforeSend;
		this.success = opt.success;
		this.error = opt.error;
		this.loginNotice = opt.loginNotice;
		this.data = opt.data;
		this.complete = opt.complete;
		this.loginCheck = opt.loginCheck;
		
		init(this);
		
		UpLoadInstances.push(this);
	}
	/**
	 * 通过cookie粗略检查是否登录
	 */
	function simpleCheckIfLogin (){
		if($.cookie == null){
			logErr('找不到获取$.cookie对象，需要引入 :wq.common.js');
			throw new Error('找不到获取$.cookie对象，需要引入 :wq.common.js');
			return false;
		}
		
		if($.cookie('tk') != null && $.cookie('tk') != ''){
			return true;
		}else{
			return false;
		}
		
	}
	/**
	 * 初始化页面元素
	 * @usage [使用说明]
	 * @author wuchangming
	 * @email changming.wu@woqu.com
	 * @date 2015年1月12日
	 */
	function init(obj){
		var dataInputString = (function(datas){
			var inputStrings = '';
			if(datas == null){
				return "";
			}
			for(var name in datas){
				inputStrings += '<input type="hidden" name="'+ name +'" value="' + datas[name] + '" />'
			}
			return inputStrings;
		})(obj.data);
		
		
		var form = '<form  id="'+ obj.upLoadFormName +'" action="' + obj.url + '" method="post" enctype="multipart/form-data" target="' + obj.targetIframeName + '">'+
					'<div  style="position:absolute;background:#000; overflow:hidden;opacity:0;filter:alpha(opacity=0);">'+
					'<input type="file" name="file" style="font-size:10000px;position:absolute;right:0px;filter:alpha(opacity=0);"/>' + dataInputString + 
					'</div>'+
					'</form>';
		
		var iframe = '<iframe class="hide" name="' + obj.targetIframeName + '" onload="$.wqUploadFileIframeCB(this,'+ obj.index +');"></iframe>';
		
		$('body').append(form);
		$('body').append(iframe);
		
		//处理文件上传Input
		renderInputFile(obj);
		
		//绑定 change事件
		$('#' + obj.upLoadFormName).on('change','input[type=file]',function(){
			
			if(obj.loginCheck && !simpleCheckIfLogin()){
				if(obj.loginNotice != null){
					obj.loginNotice.call(getTopPageWindow(window));
				}
				logErr("上传文件出错，未登录！");
				//重置
				resetInputFile(obj);
				return;
			}
			if(obj.sending == true){
				return;
			}
			if(obj.beforeSend != null && typeof obj.beforeSend === 'function'){
				var inputObj = $('#' + obj.upLoadFormName).find('input[type=file]');
				var result = obj.beforeSend.call(window,inputObj);
				if(result === false){
					//重置
					resetInputFile(obj);
					return;
				}
			}
			//设置发送状态
			obj.sending = true;
			$('#'+obj.upLoadFormName).submit();
			
		});
		
		
		
	}
	
	/**
	 * 重置<input file="file" />
	 */
	function resetInputFile(obj){
		
		$('#' + obj.upLoadFormName + ' input[type=file]').replaceWith('<input type="file" name="file" style="font-size:10000px;position:absolute;right:0px;filter:alpha(opacity=0);" />');
		if(ieFlag){
			renderInputFile(obj);
		}
	}
	
	/**
	 * 根据不同浏览器处理文件上传Input
	 */
	function renderInputFile(obj){
		//IE
		if(ieFlag){
			//IE8_bug
			if(ieVersion == 8){
				setTimeout(function(){
					positionFix(obj);
				},500);
			}else{
				positionFix(obj);
			}
		}else{//others
			$('#' + obj.upLoadFormName).find('div').hide();
			obj.selector.click(function(e){
			    e.preventDefault();
			    $('#' + obj.upLoadFormName).find('input[type=file]').trigger('click');
			});
		}
		
		
	}
	/**
	 * ie下重新调整位置
	 */
	function positionFix(obj){
		var offSet = obj.selector.offset();
		$('#' + obj.upLoadFormName).find('div').css({
				"left":offSet.left,
				"top":offSet.top,
				"width":obj.selector.width(),
				"height":obj.selector.height()
			})
	}
	
	/**
	 * @usage 解析返回内容
	 * @author wuchangming
	 * @email changming.wu@woqu.com
	 * @date 2015年1月12日
	 */
	function parseResult(iFrameWin){
		try{
			var bodyText = iFrameWin.document.body.innerHTML;
			return eval('(' + bodyText + ')');
		}catch (e) {
			logErr(e);
			return null;
		}
	}
	
	
	/**
	 * @usage 打印错误日志
	 * @author wuchangming
	 * @email changming.wu@woqu.com
	 * @date 2015年1月12日
	 */
	function logErr(errMsg){
		if(window.console != null){
			window.console.log(errMsg);
		}
	}
	
	/**
	 * 获取top window,即非iframe window
	 */
	function getTopPageWindow(_window){
		if(_window.self != _window.top){
			return getTopPageWindow(_window.parent);
		}else{
			return _window;
		}
	}
	
})();

